'use server'

import { revalidatePath } from 'next/cache'

import { env } from '@/config/env'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'
import { requireTenant } from '@/lib/tenant'

import {
  addKashierApiSchema,
  debitBalanceSchema,
  initiatePaymentSchema,
  paymentRecordSchema,
  rechargeBalanceSchema,
  updateSubscriptionSchema,
} from './validations'
import { creditBalance, debitBalance } from './providers/balance'
import { createKashierCheckoutUrl } from './providers/kashier'
import { createTeacherSubscription } from './providers/subscription'
import { getSubscriptionPlanConfig } from './providers/plan-config'

const SUBSCRIPTION_PAYMENT_LINKS: Record<string, string | undefined> = {
  STARTER_MONTHLY: env.KASHIER_SUBSCRIPTION_LINK_STARTER_MONTHLY,
  STARTER_YEARLY: env.KASHIER_SUBSCRIPTION_LINK_STARTER_YEARLY,
  PROFESSIONAL_MONTHLY: env.KASHIER_SUBSCRIPTION_LINK_PROFESSIONAL_MONTHLY,
  PROFESSIONAL_YEARLY: env.KASHIER_SUBSCRIPTION_LINK_PROFESSIONAL_YEARLY,
  ENTERPRISE_MONTHLY: env.KASHIER_SUBSCRIPTION_LINK_ENTERPRISE_MONTHLY,
  ENTERPRISE_YEARLY: env.KASHIER_SUBSCRIPTION_LINK_ENTERPRISE_YEARLY,
}

function makeOrderId(prefix: string, tenantSlug: string, count: number) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${prefix}-${tenantSlug}-${date}-${String(count + 1).padStart(4, '0')}`
}

function normalizePaymentLinkIdentifier(raw: string) {
  const value = raw.trim()

  if (!value) return null

  if (value.includes('checkouts.kashier.io')) {
    try {
      const url = new URL(value)
      const pplink = url.searchParams.get('pplink')
      if (pplink) return pplink
    } catch {
      return null
    }
  }

  return value
}

function buildSubscriptionPaymentLinkUrl(
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
  cycle: 'MONTHLY' | 'YEARLY',
  orderId: string,
) {
  const key = `${plan}_${cycle}`
  const rawLink = SUBSCRIPTION_PAYMENT_LINKS[key]

  if (!rawLink) {
    throw new Error(`Payment Link غير مضبوط للخطة ${plan} (${cycle})`)
  }

  const pplink = normalizePaymentLinkIdentifier(rawLink)
  if (!pplink) {
    throw new Error(`Payment Link غير صالح للخطة ${plan} (${cycle})`)
  }

  const checkoutUrl = new URL('https://checkouts.kashier.io/en/paymentlinkPage')
  checkoutUrl.searchParams.set('pplink', pplink)
  // نحافظ على مرجع داخلي لتتبع الطلب في logs/الدعم حتى لو Kashier لم يمرره للويبهوك.
  checkoutUrl.searchParams.set('merchantOrderId', orderId)

  return checkoutUrl.toString()
}

function mapPaymentToClientItem(payment: {
  id: string
  studentId: string
  month: string
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
  amount: number
  student: { name: string }
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

  const count = await db.payment.count({ where: { tenantId: tenant.id } })
  const receiptNumber = makeOrderId('RCP', tenant.slug, count)

  const student = await db.user.findFirst({
    where: { id: data.studentId, tenantId: tenant.id },
    select: {
      id: true,
      groupStudents: {
        where: { status: 'ACTIVE' },
        include: { group: { select: { monthlyFee: true } } },
        take: 1,
      },
    },
  })

  if (!student) throw new Error('?????? ??? ????? ?? ?? ????? ???? ??????')

  const monthlyFee = student.groupStudents[0]?.group.monthlyFee ?? 0

  const existingPayments = await db.payment.findMany({
    where: {
      tenantId: tenant.id,
      studentId: data.studentId,
      month: data.month,
      status: { in: ['PAID', 'PARTIAL'] },
    },
    select: { amount: true },
  })

  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + data.amount

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
      paidAt: status === 'PAID' ? new Date() : null,
      paymentGateway: 'KASHIER',
    },
  })

  await logFinancialEvent({
    tenantId: tenant.id,
    actorId: user.id,
    eventType: 'PAYMENT_CREATED',
    entityType: 'PAYMENT',
    entityId: payment.id,
    message: `Manual payment recorded (${status})`,
    metadata: { amount: data.amount, month: data.month },
  })

  revalidatePath('/payments')
  return { success: true, data: { payment, receiptNumber } }
}

export async function sendPaymentReminder(studentIds: string[]) {
  const tenant = await requireTenant()
  await requireAuth()

  const results = await Promise.allSettled(
    studentIds.map(async (studentId) => {
      const student = await db.user.findFirst({
        where: { id: studentId, tenantId: tenant.id },
      })
      if (!student?.parentPhone) return

      await db.notification.create({
        data: {
          tenantId: tenant.id,
          userId: studentId,
          type: 'PAYMENT_REMINDER',
          message: `????? ????? ???????? ???????? — ${tenant.name}`,
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

  if (!payment) throw new Error('??????? ??? ????? ?? ?? ????? ???? ??????')

  return {
    success: true,
    data: { payment, tenantName: tenant.name },
  }
}

export async function initiateOnlinePayment(formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  const data = initiatePaymentSchema.parse({
    studentId: formData.get('studentId'),
    amount: Number(formData.get('amount')),
    month: formData.get('month'),
    notes: formData.get('notes') || undefined,
  })

  const student = await db.user.findFirst({
    where: { id: data.studentId, tenantId: tenant.id },
    select: { id: true, name: true, phone: true },
  })
  if (!student) throw new Error('?????? ??? ????? ?? ?? ????? ???? ??????')

  const existing = await db.payment.findFirst({
    where: {
      tenantId: tenant.id,
      studentId: data.studentId,
      month: data.month,
      status: 'PENDING',
      receiptNumber: { startsWith: 'KSH-' },
    },
  })
  if (existing) throw new Error('???? ??? ??? ??????? ???? ???? ?????')

  const count = await db.payment.count({ where: { tenantId: tenant.id } })
  const orderId = makeOrderId('KSH', tenant.slug, count)

  await db.payment.create({
    data: {
      tenantId: tenant.id,
      studentId: data.studentId,
      amount: data.amount,
      month: data.month,
      status: 'PENDING',
      method: 'CARD',
      receiptNumber: orderId,
      recordedById: user.id,
      notes: data.notes ? `TUITION:${data.notes}` : 'TUITION',
      paymentGateway: 'KASHIER',
    },
  })

  const appUrl = env.NEXT_PUBLIC_APP_URL
  const callbackUrl = `${appUrl}/api/payments/kashier/callback?orderId=${orderId}`
  const webhookUrl = `${appUrl}/api/payments/kashier/webhook`

  const checkoutUrl = createKashierCheckoutUrl({
    orderId,
    amount: data.amount,
    studentName: student.name ?? '????',
    customerPhone: student.phone,
    metadata: {
      paymentType: 'tuition',
      tenantId: tenant.id,
      studentId: student.id,
    },
    callbackUrl,
    webhookUrl,
  })

  return { success: true, checkoutUrl }
}

export async function initiateBalanceRecharge(input: {
  studentId: string
  amount: number
  description?: string
}) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  const data = rechargeBalanceSchema.parse({
    amount: input.amount,
    description: input.description,
  })

  const student = await db.user.findFirst({
    where: { id: input.studentId, tenantId: tenant.id },
    select: { id: true, name: true, phone: true },
  })

  if (!student) throw new Error('???????? ???????? ????? ??? ?????')

  const count = await db.payment.count({ where: { tenantId: tenant.id } })
  const orderId = makeOrderId('RCH', tenant.slug, count)
  const month = new Date().toISOString().slice(0, 7)

  await db.payment.create({
    data: {
      tenantId: tenant.id,
      studentId: student.id,
      amount: data.amount,
      month,
      status: 'PENDING',
      method: 'CARD',
      receiptNumber: orderId,
      recordedById: user.id,
      notes: `RECHARGE:${data.description ?? ''}`,
      paymentGateway: 'KASHIER',
    },
  })

  const appUrl = env.NEXT_PUBLIC_APP_URL
  const callbackUrl = `${appUrl}/api/payments/kashier/callback?orderId=${orderId}`
  const webhookUrl = `${appUrl}/api/payments/kashier/webhook`

  const checkoutUrl = createKashierCheckoutUrl({
    orderId,
    amount: data.amount,
    studentName: student.name ?? '????',
    customerPhone: student.phone,
    metadata: {
      paymentType: 'wallet_recharge',
      tenantId: tenant.id,
      studentId: student.id,
    },
    callbackUrl,
    webhookUrl,
  })

  return { success: true, checkoutUrl, orderId }
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
      select: { id: true },
    })

    if (!student) {
      throw new Error('?????? ??? ?????')
    }

    let paymentId = input.id

    if (paymentId) {
      const existingPayment = await db.payment.findFirst({
        where: { id: paymentId, tenantId: tenant.id },
        select: { id: true },
      })

      if (!existingPayment) {
        throw new Error('?????? ??? ??????')
      }

      await db.payment.update({
        where: { id: existingPayment.id },
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
      const receiptNumber = makeOrderId('RCP', tenant.slug, count)

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
        select: { id: true },
      })

      paymentId = createdPayment.id
    }

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        studentId: true,
        month: true,
        status: true,
        amount: true,
        student: { select: { name: true } },
      },
    })

    if (!payment) {
      throw new Error('???? ????? ?????? ?????? ??? ?????')
    }

    revalidatePath('/payments')

    return {
      success: true,
      payment: mapPaymentToClientItem(payment),
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '???? ??? ??????',
    }
  }
}

export async function debitStudentBalance(input: {
  studentId: string
  amount: number
  month: string
  reason: string
}) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth()

    const validated = debitBalanceSchema.parse({
      studentId: input.studentId,
      amount: input.amount,
      reason: input.reason,
    })

    const count = await db.payment.count({ where: { tenantId: tenant.id } })
    const receiptNumber = makeOrderId('BAL', tenant.slug, count)

    const payment = await db.payment.create({
      data: {
        tenantId: tenant.id,
        studentId: validated.studentId,
        amount: validated.amount,
        month: input.month,
        status: 'PENDING',
        method: 'CARD',
        receiptNumber,
        recordedById: user.id,
        paymentGateway: 'INTERNAL_BALANCE',
        notes: `BALANCE:${validated.reason}`,
      },
      include: { student: { select: { name: true } } },
    })

    await debitBalance(validated.studentId, validated.amount, validated.reason, payment.id)

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    await logFinancialEvent({
      tenantId: tenant.id,
      actorId: user.id,
      eventType: 'PAYMENT_CONFIRMED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      message: 'Internal balance payment confirmed',
    })

    revalidatePath('/payments')

    return {
      success: true,
      message: '?? ????? ????? ?? ??????',
      payment: mapPaymentToClientItem({
        ...payment,
        status: 'PAID',
      }),
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '??? ??? ??????',
    }
  }
}

export async function creditBalanceAfterPayment(input: {
  studentId: string
  amount: number
  relatedPaymentId?: string
  reason?: string
}) {
  try {
    await requireAuth()

    const result = await creditBalance(
      input.studentId,
      input.amount,
      input.reason ?? '????? ???? ??? Kashier',
      input.relatedPaymentId,
    )

    revalidatePath('/dashboard')

    return {
      success: true,
      message: '?? ????? ?????? ?????',
      balance: result.balance,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '??? ????? ??????',
    }
  }
}

export async function addTeacherKashierApi(input: { kashierApiKey: string; kashierMerId: string }) {
  try {
    const validated = addKashierApiSchema.parse(input)
    const { addKashierApiCredentials } = await import('./providers/subscription')

    const result = await addKashierApiCredentials(validated.kashierApiKey, validated.kashierMerId)

    revalidatePath('/settings')

    return result
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '??? ??? ?????? Kashier',
    }
  }
}

export async function createTeacherSubscriptionPayment(input: {
  subscriptionPlan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  billingCycle: 'MONTHLY' | 'YEARLY'
  amount: number
  transactionId: string
}) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth()

    const planConfig = await getSubscriptionPlanConfig(input.subscriptionPlan)
    const expectedAmount = input.billingCycle === 'MONTHLY' ? planConfig.monthlyPrice : planConfig.yearlyPrice

    if (input.amount !== expectedAmount) {
      throw new Error('?????? ??????? ?? ?????? ?? ??? ?????')
    }

    const subscription = await createTeacherSubscription(input.subscriptionPlan, input.billingCycle)

    await db.payment.create({
      data: {
        tenantId: tenant.id,
        studentId: user.id,
        amount: input.amount,
        month: new Date().toISOString().slice(0, 7),
        status: 'PAID',
        method: 'CARD',
        receiptNumber: `SUB-${tenant.slug}-${input.subscriptionPlan}-${Date.now()}`,
        recordedById: user.id,
        transactionId: input.transactionId,
        paidAt: new Date(),
        notes: `SUBSCRIPTION:${input.subscriptionPlan}:${input.billingCycle}`,
      },
    })

    revalidatePath('/dashboard')

    return {
      success: true,
      message: '?? ????? ???????? ?????',
      subscription,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '??? ????? ????????',
    }
  }
}

export async function initiateTeacherSubscriptionCheckout(input: {
  subscriptionPlan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  billingCycle: 'MONTHLY' | 'YEARLY'
}) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  const validated = updateSubscriptionSchema.parse(input)

  const planConfig = await getSubscriptionPlanConfig(validated.subscriptionPlan)
  if (!planConfig.isActive) {
    throw new Error('هذه الباقة غير متاحة حالياً')
  }
  const amount = validated.billingCycle === 'MONTHLY' ? planConfig.monthlyPrice : planConfig.yearlyPrice

  const count = await db.payment.count({ where: { tenantId: tenant.id } })
  const orderId = makeOrderId('SUBK', tenant.slug, count)

  await db.payment.create({
    data: {
      tenantId: tenant.id,
      studentId: user.id,
      amount,
      month: new Date().toISOString().slice(0, 7),
      status: 'PENDING',
      method: 'CARD',
      receiptNumber: orderId,
      recordedById: user.id,
      notes: `SUBSCRIPTION:${validated.subscriptionPlan}:${validated.billingCycle}`,
      paymentGateway: 'KASHIER',
    },
  })

  const appUrl = env.NEXT_PUBLIC_APP_URL
  const callbackUrl = `${appUrl}/api/payments/kashier/callback?orderId=${orderId}`
  const webhookUrl = `${appUrl}/api/payments/kashier/webhook`

  const checkoutMode = env.KASHIER_SUBSCRIPTION_CHECKOUT_MODE ?? 'hosted'
  const checkoutUrl =
    checkoutMode === 'payment_link'
      ? buildSubscriptionPaymentLinkUrl(validated.subscriptionPlan, validated.billingCycle, orderId)
      : createKashierCheckoutUrl({
          orderId,
          amount,
          studentName: user.name ?? 'Teacher',
          customerPhone: user.phone,
          metadata: {
            paymentType: 'teacher_subscription',
            tenantId: tenant.id,
            teacherId: user.id,
            plan: validated.subscriptionPlan,
            cycle: validated.billingCycle,
          },
          callbackUrl,
          webhookUrl,
        })

  return { success: true, checkoutUrl, orderId }
}

