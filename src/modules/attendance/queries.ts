import { db } from '@/lib/db'
import { cache } from 'react'

// أنواع محلية لنتائج Prisma (مؤقتاً حتى يتم توليد Prisma client)
type GroupStudentRow = {
  studentId: string
  student: {
    id: string
    name: string
    phone: string
    parentPhone: string | null
    gradeLevel: string | null
  }
}
type AttendanceRow = { id: string; studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' }
type PaymentRow = { studentId: string; status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' }

// ── B-01: Attendance Queries (read-only — NO 'use server') ──────────────────
// ⚠️ هذا الملف read-only — لا يحتوي على 'use server' ولا DB writes
// ⚠️ استدعِ generateTodaySessions() من actions.ts أولاً قبل getTodaySessions

/**
 * يجيب حصص اليوم الحالي للـ tenant مع عدد الطلاب وعدد الحاضرين
 * ⚠️ لازم تستدعي generateTodaySessions() من actions.ts قبل ما تستدعي دي
 */
export const getTodaySessions = cache(async (tenantId: string) => {
  // حساب بداية ونهاية اليوم بتوقيت Cairo
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  const today = new Date(`${year}-${month}-${day}T00:00:00.000Z`)
  const todayEnd = new Date(`${year}-${month}-${day}T23:59:59.999Z`)

  return db.session.findMany({
    where: {
      tenantId,
      date: { gte: today, lte: todayEnd },
    },
    include: {
      group: {
        include: {
          _count: {
            select: {
              students: { where: { status: 'ACTIVE' } },
            },
          },
        },
      },
      _count: {
        select: {
          attendance: { where: { status: 'PRESENT' } },
        },
      },
    },
    orderBy: { timeStart: 'asc' },
  })
})

/**
 * يجيب طلاب الحصة مع حالة الحضور + حالة الدفع للشهر الحالي
 * يعيد null لو الـ session مش موجودة أو مش تابعة للـ tenant
 */
export const getSessionAttendance = cache(
  async (tenantId: string, sessionId: string) => {
    const session = await db.session.findFirst({
      where: { id: sessionId, tenantId },
      include: { group: true },
    })
    if (!session) return null

    const students = (await db.groupStudent.findMany({
      where: { groupId: session.groupId, status: 'ACTIVE' },
      include: { student: true },
    })) as GroupStudentRow[]

    const attendanceRecords = (await db.attendance.findMany({
      where: { sessionId, tenantId },
    })) as AttendanceRow[]

    // الشهر الحالي بتوقيت Cairo
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
    })
    const parts = formatter.formatToParts(new Date())
    const currentMonth = `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`

    const payments = (await db.payment.findMany({
      where: {
        tenantId,
        month: currentMonth,
        studentId: { in: students.map((s) => s.studentId) },
      },
    })) as PaymentRow[]

    return {
      session,
      students: students.map((gs) => {
        const att = attendanceRecords.find((a) => a.studentId === gs.studentId)
        const payment = payments.find((p) => p.studentId === gs.studentId)
        return {
          ...gs.student,
          attendanceStatus: att?.status ?? 'ABSENT',
          attendanceId: att?.id ?? null,
          paymentStatus: payment?.status ?? 'PENDING',
        }
      }),
    }
  },
)

/**
 * تقرير الحضور الشهري — كل الحصص في شهر معين مع عدد الحاضرين
 * @param month - صيغة YYYY-MM
 */
export const getAttendanceReport = cache(
  async (tenantId: string, month: string) => {
    const [year, m] = month.split('-').map(Number)
    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 0, 23, 59, 59)

    return db.session.findMany({
      where: {
        tenantId,
        date: { gte: start, lte: end },
      },
      include: {
        group: true,
        _count: {
          select: {
            attendance: { where: { status: 'PRESENT' } },
          },
        },
      },
      orderBy: { date: 'asc' },
    })
  },
)

/**
 * نسبة حضور طالب في آخر 30 يوم
 * ⚠️ يستخدم createdAt مش markedAt — عشان الـ index على [studentId, createdAt]
 */
export const getStudentAttendanceRate = cache(
  async (tenantId: string, studentId: string) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const [total, present] = await Promise.all([
      db.attendance.count({
        where: { tenantId, studentId, createdAt: { gte: thirtyDaysAgo } },
      }),
      db.attendance.count({
        where: {
          tenantId,
          studentId,
          status: 'PRESENT',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ])

    return total === 0 ? 0 : Math.round((present / total) * 100)
  },
)
