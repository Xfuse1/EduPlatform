import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'

import { errorResponse, successResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'
import { creditBalanceForTenant } from '@/modules/payments/providers/balance'
import { verifyKashierWebhookSignature } from '@/modules/payments/providers/kashier'
import { activateOrRenewSubscriptionForTenant } from '@/modules/payments/providers/subscription'
import { settleTeacherPaymentToWallet } from '@/modules/payments/providers/transfer'
import { kashierWebhookSchema } from '@/modules/payments/validations'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

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

  const { orderId, transactionId, status, amount, currency, hash } = parsed.data

  if (!verifyKashierWebhookSignature(orderId, amount ?? '', currency ?? 'EGP', hash ?? '')) {
    return errorResponse('INVALID_SIGNATURE', 'Invalid webhook signature', 401)
  }

  const payment = await db.payment.findUnique({
    where: { receiptNumber: orderId },
  })

  if (!payment) {
    return successResponse({ received: true })
  }

  const wasAlreadyPaid = payment.status === 'PAID'
  const newStatus = wasAlreadyPaid ? 'PAID' : status === 'SUCCESS' ? 'PAID' : status === 'FAILED' ? 'OVERDUE' : 'PENDING'

  const updatedPayment = wasAlreadyPaid
    ? payment
    : await db.payment.update({
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
      // notes may include appended transaction info on new lines.
      // Keep only first line to parse SUBSCRIPTION:<PLAN>:<CYCLE>.
      const subscriptionMeta = notes.split('\n')[0]?.trim() ?? ''
      const parts = subscriptionMeta.split(':')
      const planRaw = (parts[1] ?? '').trim()
      const cycleRaw = (parts[2] ?? '').trim()
      const validPlans = new Set(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
      const validCycles = new Set(['MONTHLY', 'YEARLY'])

      if (validPlans.has(planRaw) && validCycles.has(cycleRaw)) {
        await activateOrRenewSubscriptionForTenant(
          updatedPayment.tenantId,
          planRaw as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
          cycleRaw as 'MONTHLY' | 'YEARLY',
        )
      }
    } else {
      await settleTeacherPaymentToWallet(updatedPayment.id)
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

  return successResponse({ received: true, idempotent: wasAlreadyPaid })
}

