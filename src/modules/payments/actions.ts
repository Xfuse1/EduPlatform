'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { paymentRecordSchema, initiatePaymentSchema } from './validations'
import { createKashierCheckoutUrl } from './providers/kashier'
import { env } from '@/config/env'

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

/**
 * بدء دفع أونلاين عبر Kashier
 * 1. ينشئ سجل Payment بحالة PENDING في DB
 * 2. يولّد رابط Kashier Checkout
 * 3. يرجع الرابط للـ client للـ redirect
 *
 * ⚠️ الإيصال يُكتمل بعد تأكيد الـ webhook — مش هنا
 */
export async function initiateOnlinePayment(formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  const data = initiatePaymentSchema.parse({
    studentId: formData.get('studentId'),
    amount: Number(formData.get('amount')),
    month: formData.get('month'),
    notes: formData.get('notes') || undefined,
  })

  // جيب بيانات الطالب — تحقق من tenantId
  const student = await db.user.findFirst({
    where: { id: data.studentId, tenantId: tenant.id },
    select: { id: true, name: true },
  })
  if (!student) throw new Error('الطالب غير موجود أو لا ينتمي لهذا الحساب')

  // تأكد إن مفيش دفعة Kashier معلقة لنفس الطالب ونفس الشهر
  const existing = await db.payment.findFirst({
    where: {
      tenantId: tenant.id,
      studentId: data.studentId,
      month: data.month,
      status: 'PENDING',
      receiptNumber: {
        startsWith: 'KSH-',
      },
    },
  })
  if (existing) throw new Error('يوجد طلب دفع أونلاين معلق لهذا الشهر — انتظر تأكيد العملية أو تواصل مع الدعم')

  // توليد orderId فريد: KSH-{slug}-{YYYYMMDD}-{count+1}
  const count = await db.payment.count({ where: { tenantId: tenant.id } })
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const kashierOrderId = `KSH-${tenant.slug}-${date}-${String(count + 1).padStart(4, '0')}`

  // إنشاء سجل Payment معلق — سيُحدَّث عبر webhook
  await db.payment.create({
    data: {
      tenantId: tenant.id,
      studentId: data.studentId,
      amount: data.amount,
      month: data.month,
      status: 'PENDING',
      method: 'CARD',
      receiptNumber: kashierOrderId,
      recordedById: user.id,
      notes: data.notes ? `Kashier: ${data.notes}` : 'Kashier checkout initiated',
    },
  })

  // بناء الـ URLs
  const appUrl = env.NEXT_PUBLIC_APP_URL
  // ⚠️ callbackUrl = API route الذي يقرأ حالة DB ويعمل redirect للمستخدم
  const callbackUrl = `${appUrl}/api/payments/kashier/callback?orderId=${kashierOrderId}`
  const webhookUrl = `${appUrl}/api/payments/kashier/webhook`

  const checkoutUrl = createKashierCheckoutUrl({
    orderId: kashierOrderId,
    amount: data.amount,
    studentName: student.name ?? 'طالب',
    callbackUrl,
    webhookUrl,
  })

  return { success: true, checkoutUrl }
}

function mapPaymentToClientItem(payment: {
  id: string
  studentId: string
  month: string
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
  amount: number
  student: {
    name: string
  }
}) {
  return {
    id: payment.id,
    studentId: payment.studentId,
    studentName: payment.student.name,
    month: payment.month,
    status: payment.status,
    amount: payment.amount,
  }
}

export async function savePayment(input: {
  id?: string
  studentId: string
  month: string
  amount: number
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
}) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth()

    const student = await db.user.findFirst({
      where: {
        id: input.studentId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
      },
    })

    if (!student) {
      throw new Error('الطالب غير موجود')
    }

    let paymentId = input.id

    if (paymentId) {
      const existingPayment = await db.payment.findFirst({
        where: {
          id: paymentId,
          tenantId: tenant.id,
        },
        select: {
          id: true,
        },
      })

      if (!existingPayment) {
        throw new Error('الدفعة غير موجودة')
      }

      await db.payment.update({
        where: {
          id: existingPayment.id,
        },
        data: {
          studentId: input.studentId,
          month: input.month,
          amount: input.amount,
          status: input.status,
          method: 'CASH',
          paidAt: input.status === 'PAID' ? new Date() : null,
          recordedById: user.id,
        },
      })
    } else {
      const count = await db.payment.count({ where: { tenantId: tenant.id } })
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const receiptNumber = `RCP-${tenant.slug}-${date}-${String(count + 1).padStart(4, '0')}`

      const createdPayment = await db.payment.create({
        data: {
          tenantId: tenant.id,
          studentId: input.studentId,
          month: input.month,
          amount: input.amount,
          status: input.status,
          method: 'CASH',
          receiptNumber,
          paidAt: input.status === 'PAID' ? new Date() : null,
          recordedById: user.id,
        },
        select: {
          id: true,
        },
      })

      paymentId = createdPayment.id
    }

    const payment = await db.payment.findUnique({
      where: {
        id: paymentId,
      },
      select: {
        id: true,
        studentId: true,
        month: true,
        status: true,
        amount: true,
        student: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!payment) {
      throw new Error('تعذر تحميل بيانات الدفعة بعد الحفظ')
    }

    revalidatePath('/payments')

    return {
      success: true,
      payment: mapPaymentToClientItem(payment),
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'تعذر حفظ الدفعة',
    }
  }
}
