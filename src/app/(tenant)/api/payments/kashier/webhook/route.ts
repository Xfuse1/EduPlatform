import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'

import { errorResponse, successResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'
import { creditBalanceForTenant } from '@/modules/payments/providers/balance'
import { verifyKashierWebhookSignature } from '@/modules/payments/providers/kashier'
import { createTeacherSubscriptionForTenant } from '@/modules/payments/providers/subscription'
import { enqueueTeacherTransferForPayment } from '@/modules/payments/providers/transfer'
import { kashierWebhookSchema } from '@/modules/payments/validations'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const signature = req.headers.get('x-kashier-signature') ?? ''
  if (!verifyKashierWebhookSignature(rawBody, signature)) {
    return errorResponse('INVALID_SIGNATURE', 'Invalid webhook signature', 401)
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return errorResponse('INVALID_JSON', 'Webhook payload is not valid JSON', 400)
  }

  const parsed = kashierWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('INVALID_PAYLOAD', 'Webhook payload is invalid', 400)
  }

  const { orderId, transactionId, status } = parsed.data

  const payment = await db.payment.findUnique({
    where: { receiptNumber: orderId },
  })

  if (!payment) {
    return successResponse({ received: true })
  }

  if (payment.status === 'PAID') {
    return successResponse({ received: true, idempotent: true })
  }

  const newStatus = status === 'SUCCESS' ? 'PAID' : status === 'FAILED' ? 'OVERDUE' : 'PENDING'

  const updatedPayment = await db.payment.update({
    where: { id: payment.id },
    data: {
      status: newStatus,
      transactionId: transactionId ?? payment.transactionId,
      paidAt: status === 'SUCCESS' ? new Date() : null,
      notes: transactionId
        ? `${payment.notes ?? ''}\nKashier transaction: ${transactionId}`.trim()
        : payment.notes,
    },
  })

  if (newStatus === 'PAID') {
    const notes = updatedPayment.notes ?? ''

    if (orderId.startsWith('RCH-') || notes.startsWith('RECHARGE:')) {
      await creditBalanceForTenant(
        updatedPayment.tenantId,
        updatedPayment.studentId,
        updatedPayment.amount,
        'Recharge via Kashier',
        updatedPayment.id,
      )
    } else if (orderId.startsWith('SUBK-') || notes.startsWith('SUBSCRIPTION:')) {
      const parts = notes.split(':')
      const plan = parts[1] as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | undefined
      const cycle = parts[2] as 'MONTHLY' | 'YEARLY' | undefined

      if (plan && cycle) {
        const existingSubscription = await db.teacherSubscription.findUnique({
          where: { tenantId: updatedPayment.tenantId },
        })

        if (!existingSubscription) {
          await createTeacherSubscriptionForTenant(updatedPayment.tenantId, plan, cycle)
        }
      }
    } else {
      const teacherApi = await db.teacherSubscription.findUnique({
        where: { tenantId: updatedPayment.tenantId },
        select: { kashierApiKey: true, kashierMerId: true },
      })

      if (teacherApi?.kashierApiKey && teacherApi.kashierMerId) {
        await enqueueTeacherTransferForPayment(updatedPayment.id)
      }
    }

    await logFinancialEvent({
      tenantId: updatedPayment.tenantId,
      eventType: 'PAYMENT_CONFIRMED',
      entityType: 'PAYMENT',
      entityId: updatedPayment.id,
      message: 'Kashier payment confirmed',
      metadata: { orderId, transactionId },
    })
  }

  if (newStatus === 'OVERDUE') {
    await logFinancialEvent({
      tenantId: updatedPayment.tenantId,
      eventType: 'PAYMENT_FAILED',
      entityType: 'PAYMENT',
      entityId: updatedPayment.id,
      message: 'Kashier payment failed',
      metadata: { orderId, transactionId },
    })
  }

  revalidatePath('/payments')
  revalidatePath('/dashboard')

  return successResponse({ received: true })
}

