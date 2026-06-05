'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { requireRole, STAFF_ROLES } from '@/lib/permissions'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { getSessionEndDate, getSessionStartDate } from '@/modules/attendance/sessionStatus'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  attendanceBulkSchema,
  manualSessionSchema,
  offlineSyncSchema,
} from './validations'
import { sendNotification } from '@/modules/notifications/actions'

// ── B-01 + B-06: Attendance Actions (mutations — 'use server') ───────────────
// ملاحظة: توليد حصص اليوم يتم عبر getTodaySessions() (upsert على نفس مفتاح
// التاريخ القانوني) لتفادي اختلاف مفتاح @@unique([groupId, date]).

/**
 * تسجيل حضور bulk لحصة كاملة + إرسال إشعارات (B-06)
 * ⚠️ الإشعارات fire & forget — لا توقف الـ response
 */
export async function markAttendance(
  sessionId: string,
  records: {
    studentId: string
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  }[],
) {
  const tenant = await requireTenant()
  const user = await requireAuth()
  requireRole(user.role, STAFF_ROLES)

  const validated = attendanceBulkSchema.parse({ sessionId, records })

  // تحقق إن الـ session تابعة للـ tenant مع include group للإشعارات
  const session = await db.session.findFirst({
    where: { id: validated.sessionId, tenantId: tenant.id },
    include: { group: true },
  })
  if (!session) throw new Error('الحصة غير موجودة أو لا تنتمي لهذا الحساب')

  // المعلّم يقتصر على مجموعاته فقط
  const scopeUserId = getTeacherScopeUserId(tenant, user)
  if (scopeUserId && session.group.teacherId !== scopeUserId) {
    throw new Error('الحصة غير موجودة أو لا تنتمي لهذا الحساب')
  }

  // استبعاد أي طالب ليس عضواً نشطاً في مجموعة الحصة
  const activeMembers = await db.groupStudent.findMany({
    where: { groupId: session.groupId, status: 'ACTIVE' },
    select: { studentId: true },
  })
  const activeStudentIds = new Set(activeMembers.map((m) => m.studentId))
  const validRecords = validated.records.filter((record) =>
    activeStudentIds.has(record.studentId),
  )
  if (validRecords.length === 0) {
    throw new Error('لا يوجد طلاب صالحون لتسجيل الحضور في هذه الحصة')
  }

  // Bulk upsert
  await Promise.all(
    validRecords.map((record) =>
      db.attendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: validated.sessionId,
            studentId: record.studentId,
          },
        },
        update: {
          status: record.status,
          markedById: user.id,
          markedAt: new Date(),
          synced: true,
        },
        create: {
          tenantId: tenant.id,
          sessionId: validated.sessionId,
          groupId: session.groupId,
          studentId: record.studentId,
          status: record.status,
          markedById: user.id,
          method: 'MANUAL',
          markedAt: new Date(),
          synced: true,
        },
      }),
    ),
  )

  // تحديث status الـ session
  await db.session.update({
    where: { id: validated.sessionId },
    data: { status: 'COMPLETED' },
  })

  // ── B-06: إرسال إشعارات — fire & forget (لا يوقف الـ response) ──────────
  // ✅ session.group موجود لأننا عملنا include: { group: true } فوق
  // batch-load الطلاب وعلاقات أولياء الأمور مرة واحدة لتفادي N+1
  const studentIds = validRecords.map((record) => record.studentId)
  void (async () => {
    const [students, parentRelations] = await Promise.all([
      db.user.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, parentPhone: true, name: true },
      }),
      db.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, parentId: true },
      }),
    ])

    const studentById = new Map(students.map((student) => [student.id, student]))
    const parentByStudentId = new Map(
      parentRelations.map((relation) => [relation.studentId, relation.parentId]),
    )

    await Promise.allSettled(
      validRecords.map(async (record) => {
        const student = studentById.get(record.studentId)
        if (!student?.parentPhone) return

        const parentId = parentByStudentId.get(record.studentId)
        if (!parentId) return

        await sendNotification({
          userId: parentId,
          type:
            record.status === 'PRESENT'
              ? 'ATTENDANCE_PRESENT'
              : 'ATTENDANCE_ABSENT',
          channel: 'SMS',
          recipientPhone: student.parentPhone,
          templateData: {
            studentName: student.name,
            subject: session.group.subject,
            time: session.timeStart,
          },
        })
      }),
    )
  })()
  // ────────────────────────────────────────────────────────────────────────────

  revalidatePath('/attendance')
  return { success: true }
}

/**
 * إنشاء حصة يدوية (تعويضية أو إضافية)
 */
export async function createManualSession(
  groupId: string,
  date: Date,
  type: 'MAKEUP' | 'EXTRA',
) {
  const tenant = await requireTenant()
  const user = await requireAuth()
  requireRole(user.role, STAFF_ROLES)

  const validated = manualSessionSchema.parse({ groupId, date, type })

  const scopeUserId = getTeacherScopeUserId(tenant, user)
  const group = await db.group.findFirst({
    where: {
      id: validated.groupId,
      tenantId: tenant.id,
      ...(scopeUserId ? { teacherId: scopeUserId } : {}),
    },
  })
  if (!group) throw new Error('المجموعة غير موجودة أو لا تنتمي لهذا الحساب')

  const existing = await db.session.findFirst({
    where: {
      groupId: validated.groupId,
      date: validated.date,
      tenantId: tenant.id,
    },
  })
  if (existing) {
    throw new Error('يوجد بالفعل حصة لهذه المجموعة في هذا التاريخ')
  }

  const session = await db.session.create({
    data: {
      tenantId: tenant.id,
      groupId: validated.groupId,
      date: validated.date,
      timeStart: group.timeStart,
      timeEnd: group.timeEnd,
      status: 'SCHEDULED',
      type: validated.type,
    },
  })

  revalidatePath('/attendance')
  return { success: true, data: session }
}

/**
 * مزامنة سجلات الـ offline queue
 */
export async function syncOfflineRecords(
  records: {
    sessionId: string
    studentId: string
    status: string
    markedAt: string
  }[],
) {
  const tenant = await requireTenant()
  const user = await requireAuth()
  requireRole(user.role, STAFF_ROLES)

  const validated = offlineSyncSchema.parse(records)

  const scopeUserId = getTeacherScopeUserId(tenant, user)

  const results = await Promise.allSettled(
    validated.map(async (record) => {
      const session = await db.session.findFirst({
        where: { id: record.sessionId, tenantId: tenant.id },
        include: { group: { select: { teacherId: true } } },
      })
      if (!session) throw new Error('الحصة غير موجودة أو لا تنتمي لهذا الحساب')

      // المعلّم يقتصر على مجموعاته فقط
      if (scopeUserId && session.group.teacherId !== scopeUserId) {
        throw new Error('الحصة غير موجودة أو لا تنتمي لهذا الحساب')
      }

      // لا يُسمح بمزامنة سجلات لحصة مكتملة
      if (session.status === 'COMPLETED') {
        throw new Error('لا يمكن مزامنة سجلات لحصة مكتملة')
      }

      // استبعاد أي طالب ليس عضواً نشطاً في مجموعة الحصة
      const membership = await db.groupStudent.findFirst({
        where: {
          groupId: session.groupId,
          studentId: record.studentId,
          status: 'ACTIVE',
        },
        select: { studentId: true },
      })
      if (!membership) {
        throw new Error('الطالب ليس عضواً نشطاً في مجموعة الحصة')
      }

      // تثبيت markedAt داخل نطاق الحصة (من البداية حتى النهاية)
      const sessionStart = getSessionStartDate(session)
      const sessionEnd = getSessionEndDate(session)
      let markedAt = new Date(record.markedAt)
      if (sessionStart && markedAt < sessionStart) markedAt = sessionStart
      if (sessionEnd && markedAt > sessionEnd) markedAt = sessionEnd

      await db.attendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: record.sessionId,
            studentId: record.studentId,
          },
        },
        update: {
          status: record.status,
          markedById: user.id,
          markedAt,
          synced: true,
        },
        create: {
          tenantId: tenant.id,
          sessionId: record.sessionId,
          groupId: session.groupId,
          studentId: record.studentId,
          status: record.status,
          markedById: user.id,
          method: 'MANUAL',
          markedAt,
          synced: true,
        },
      })
    }),
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  return {
    success: true,
    synced: validated.length - failed,
    failed,
  }
}
