'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { paymentRecordSchema } from './validations'

// ── B-03: Payments Actions (mutations — 'use server') ───────────────────────

/**
 * تسجيل دفعة جديدة مع توليد رقم إيصال فريد
 * يحسب الحالة تلقائياً: PAID / PARTIAL / PENDING بناءً على الـ monthlyFee
 */
export async function recordPayment(formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  const data = paymentRecordSchema.parse({
    studentId: formData.get('studentId'),
    amount: Number(formData.get('amount')),
    month: formData.get('month'),
    method: formData.get('method'),
    notes: formData.get('notes') || undefined,
  })

  // توليد رقم إيصال فريد: RCP-{slug}-{YYYYMMDD}-{count+1 (4 digits)}
  const count = await db.payment.count({ where: { tenantId: tenant.id } })
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const receiptNumber = `RCP-${tenant.slug}-${date}-${String(count + 1).padStart(4, '0')}`

  // جيب بيانات الطالب مع التسجيلات النشطة لمعرفة الـ monthlyFee
  const student = await db.user.findFirst({
    where: { id: data.studentId, tenantId: tenant.id },
    include: {
      enrollments: {
        where: { status: 'ACTIVE' },
        include: { group: true },
        take: 1,
      },
    },
  })
  if (!student) throw new Error('الطالب غير موجود أو لا ينتمي لهذا الحساب')

  const monthlyFee = student.enrollments[0]?.group?.monthlyFee ?? 0

  // احسب إجمالي ما تم دفعه في هذا الشهر
  const existingPayments = await db.payment.findMany({
    where: {
      tenantId: tenant.id,
      studentId: data.studentId,
      month: data.month,
    },
  })
  const totalPaid =
    existingPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) + data.amount

  // حدد الحالة بناءً على المبلغ المدفوع
  let status: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING'
  if (monthlyFee > 0 && totalPaid >= monthlyFee) status = 'PAID'
  else if (totalPaid > 0) status = 'PARTIAL'

  const payment = await db.payment.create({
    data: {
      tenantId: tenant.id,
      studentId: data.studentId,
      amount: data.amount,
      month: data.month,
      status,
      method: data.method,
      receiptNumber,
      recordedById: user.id,
      notes: data.notes ?? null,
      paidAt: new Date(),
    },
  })

  revalidatePath('/payments')
  return { success: true, data: { payment, receiptNumber } }
}

/**
 * إرسال تذكيرات دفع لقائمة من الطلاب
 * يستخدم Promise.allSettled — فشل واحد لا يوقف الباقيين
 * سيُربط بنظام الإشعارات الكامل في B-06
 */
export async function sendPaymentReminder(studentIds: string[]) {
  const tenant = await requireTenant()
  await requireAuth()

  const results = await Promise.allSettled(
    studentIds.map(async (studentId) => {
      const student = await db.user.findFirst({
        where: { id: studentId, tenantId: tenant.id },
      })
      if (!student?.parentPhone) return

      // تسجيل الإشعار في DB (سيُرسل عبر SMS provider في B-06)
      await db.notification.create({
        data: {
          tenantId: tenant.id,
          userId: studentId,
          type: 'PAYMENT_REMINDER',
          message: `💰 تذكير بسداد المصاريف المستحقة — ${tenant.name}`,
          channel: 'SMS',
          status: 'QUEUED',
          recipientPhone: student.parentPhone,
        },
      })
    }),
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  revalidatePath('/payments/overdue')
  return { success: true, sent }
}

/**
 * جلب بيانات الإيصال لطباعتها أو عرضها
 * ⚠️ يتحقق من tenantId قبل الإعادة
 */
export async function generateReceipt(paymentId: string) {
  const tenant = await requireTenant()
  await requireAuth()

  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId: tenant.id },
    include: {
      student: { select: { name: true, phone: true } },
      recordedBy: { select: { name: true } },
    },
  })

  if (!payment) throw new Error('الإيصال غير موجود أو لا ينتمي لهذا الحساب')

  return {
    success: true,
    data: { payment, tenantName: tenant.name },
  }
}
