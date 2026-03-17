import { db } from '@/lib/db'
import { cache } from 'react'

// ── B-03: Payments Queries (read-only — NO 'use server') ────────────────────

/**
 * يجيب المدفوعات مع فلترة اختيارية
 * ⚠️ tenantId في كل query — بدونه DATA LEAK
 */
export const getPayments = cache(
  async (
    tenantId: string,
    filters?: { studentId?: string; month?: string; status?: string },
  ) => {
    return db.payment.findMany({
      where: {
        tenantId,
        ...(filters?.studentId && { studentId: filters.studentId }),
        ...(filters?.month && { month: filters.month }),
        ...(filters?.status && {
          status: filters.status as 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL',
        }),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            parentPhone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  },
)

/**
 * تاريخ مدفوعات طالب معين (ledger)
 */
export const getStudentLedger = cache(
  async (tenantId: string, studentId: string) => {
    return db.payment.findMany({
      where: { tenantId, studentId },
      orderBy: { month: 'desc' },
    })
  },
)

/**
 * الطلاب المتأخرين في السداد (PENDING أو OVERDUE)
 * مرتبة تنازلياً حسب المبلغ
 */
export const getOverdueStudents = cache(async (tenantId: string) => {
  return db.payment.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING', 'OVERDUE'] },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          parentPhone: true,
          gradeLevel: true,
        },
      },
    },
    orderBy: { amount: 'desc' },
  })
})

/**
 * ملخص الإيرادات لشهر معين مع مقارنة بالشهر السابق
 * @param month - صيغة YYYY-MM (افتراضي: الشهر الحالي)
 */
export const getRevenueSummary = cache(
  async (tenantId: string, month?: string) => {
    // احسب الشهر الحالي بتوقيت Cairo
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
    })
    const parts = formatter.formatToParts(new Date())
    const cairoMonth = `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`

    const targetMonth = month ?? cairoMonth

    const payments = await db.payment.findMany({
      where: { tenantId, month: targetMonth },
    })

    const collected = payments
      .filter((p: { status: string; amount: number }) => p.status === 'PAID')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

    const outstanding = payments
      .filter((p: { status: string; amount: number }) => p.status !== 'PAID')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

    const total = collected + outstanding
    const collectionRate =
      total === 0 ? 0 : Math.round((collected / total) * 100)

    // مقارنة بالشهر السابق
    const [y, m] = targetMonth.split('-').map(Number)
    const prevDate = new Date(y, m - 2, 1)
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    const prevPayments = await db.payment.findMany({
      where: { tenantId, month: prevMonth, status: 'PAID' },
    })
    const lastMonth = prevPayments.reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0,
    )
    const comparedToLastMonth =
      lastMonth === 0
        ? 0
        : Math.round(((collected - lastMonth) / lastMonth) * 100)

    return {
      collected,
      outstanding,
      total,
      collectionRate,
      comparedToLastMonth,
      lastMonth,
    }
  },
)

/**
 * جلب Payment بواسطة kashierOrderId — يُستخدم في webhook handler
 * ⚠️ لا تثق بـ tenantId من الـ request — اجلبه من DB
 */
export const getPaymentByKashierOrderId = cache(
  async (kashierOrderId: string) => {
    return db.payment.findUnique({
      where: { kashierOrderId },
      include: {
        student: { select: { id: true, name: true, parentPhone: true } },
      },
    })
  },
)
