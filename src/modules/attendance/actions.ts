'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  attendanceBulkSchema,
  manualSessionSchema,
  offlineSyncSchema,
} from './validations'
import { sendNotification } from '@/modules/notifications/actions'

// ── B-01 + B-06: Attendance Actions (mutations — 'use server') ───────────────

/**
 * يولّد حصص اليوم الحالي تلقائياً للمجموعات النشطة
 * يتحقق من عدم وجود حصة مسبقاً (idempotent)
 * ⚠️ لازم تتنادى قبل getTodaySessions() في الـ page
 */
export async function generateTodaySessions() {
  const tenant = await requireTenant()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  const todayName = dayNames[new Date().getDay()]

  const existingSessions = (await db.session.findMany({
    where: {
      tenantId: tenant.id,
      date: { gte: today, lte: todayEnd },
    },
    select: { groupId: true },
  })) as Array<{ groupId: string }>
  const existingGroupIds = new Set(existingSessions.map((s) => s.groupId))

  const groups = (await db.group.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      days: { has: todayName },
    },
  })) as Array<{ id: string; timeStart: string; timeEnd: string }>

  if (groups.length === 0) return

  const newSessions = groups
    .filter((group) => !existingGroupIds.has(group.id))
    .map((group) => ({
      tenantId: tenant.id,
      groupId: group.id,
      date: today,
      timeStart: group.timeStart,
      timeEnd: group.timeEnd,
      status: 'SCHEDULED' as const,
      type: 'REGULAR' as const,
    }))

  if (newSessions.length > 0) {
    await db.session.createMany({ data: newSessions, skipDuplicates: true })
  }
}

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

  const validated = attendanceBulkSchema.parse({ sessionId, records })

  // تحقق إن الـ session تابعة للـ tenant مع include group للإشعارات
  const session = await db.session.findFirst({
    where: { id: validated.sessionId, tenantId: tenant.id },
    include: { group: true },
  })
  if (!session) throw new Error('الحصة غير موجودة أو لا تنتمي لهذا الحساب')

  // Bulk upsert
  await Promise.all(
    validated.records.map((record) =>
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
  void Promise.allSettled(
    validated.records.map(async (record) => {
      const student = await db.user.findUnique({
        where: { id: record.studentId },
        select: { parentPhone: true, name: true },
      })
      if (!student?.parentPhone) return

      const parentRelation = await db.parentStudent.findFirst({
        where: { studentId: record.studentId },
        select: { parentId: true },
      })
      if (!parentRelation) return

      await sendNotification({
        userId: parentRelation.parentId,
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
  await requireAuth()

  const validated = manualSessionSchema.parse({ groupId, date, type })

  const group = await db.group.findFirst({
    where: { id: validated.groupId, tenantId: tenant.id },
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

  const validated = offlineSyncSchema.parse(records)

  const results = await Promise.allSettled(
    validated.map(async (record) => {
      const session = await db.session.findFirst({
        where: { id: record.sessionId, tenantId: tenant.id },
      })
      if (!session) return

      await db.attendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: record.sessionId,
            studentId: record.studentId,
          },
        },
        update: {
          status: record.status,
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
          markedAt: new Date(record.markedAt),
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
