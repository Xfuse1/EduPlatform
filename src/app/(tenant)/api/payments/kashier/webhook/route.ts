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
import { debitUserWallet, resolveTenantPayeeUserId } from '@/modules/wallet/provider'

function getNoteNumber(notes: string, key: string) {
  const line = notes.split('\n').find((item) => item.startsWith(`${key}:`))
  const value = Number(line?.slice(key.length + 1) ?? 0)
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0
}

function hasSubscriptionApplied(notes: string) {
  return notes.split('\n').some((line) => line.startsWith('SUBSCRIPTION_APPLIED:'))
}

function appendSubscriptionApplied(notes: string) {
  if (hasSubscriptionApplied(notes)) return notes
  return `${notes}\nSUBSCRIPTION_APPLIED:${new Date().toISOString()}`.trim()
}

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
    // A signature-valid webhook referencing an unknown order is anomalous
    // (possible order-id probing). Log it for detectability but keep the 200
    // response the gateway expects. We have no tenantId to attach a financial
    // audit row to here, so emit a server-side warning instead.
    console.warn('[KASHIER_WEBHOOK] signature-valid webhook references unknown orderId', {
      orderId,
      transactionId,
      status,
    })
    return successResponse({ received: true })
  }

  // SECURITY: verify the gateway-reported amount and currency match what the
  // gateway was actually asked to charge before transitioning to PAID / crediting.
  // Prevents over-crediting from partial captures, a different currency, or a
  // mismatched/replayed payload.
  // NOTE: for split-payment subscriptions (part wallet + part card), payment.amount
  // holds the FULL plan total while Kashier was only charged KASHIER_AMOUNT. The
  // expected gateway amount is therefore KASHIER_AMOUNT for those orders; plain
  // tuition (KSH-) and recharge (RCH-) charge the full amount.
  if (status === 'SUCCESS') {
    const notesForAmount = payment.notes ?? ''
    const isSubscriptionOrder = orderId.startsWith('SUBK-') || notesForAmount.startsWith('SUBSCRIPTION:')
    const kashierPortion = getNoteNumber(notesForAmount, 'KASHIER_AMOUNT')
    const expectedAmount = isSubscriptionOrder && kashierPortion > 0 ? kashierPortion : payment.amount
    const paidAmount = Number(amount)
    const amountMatches =
      Boolean(amount) &&
      Number.isFinite(paidAmount) &&
      Math.round(paidAmount * 100) === Math.round(expectedAmount * 100)
    const currencyMatches = (currency ?? 'EGP') === 'EGP'

    if (!amountMatches || !currencyMatches) {
      await logFinancialEvent({
        tenantId: payment.tenantId,
        eventType: 'PAYMENT_FAILED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        message: 'Kashier webhook amount/currency mismatch',
        metadata: { orderId, expected: expectedAmount, reported: amount, currency },
      })
      return errorResponse('AMOUNT_MISMATCH', 'Reported amount does not match the order', 400)
    }
  }

  const wasAlreadyPaid = payment.status === 'PAID'
  const newStatus = wasAlreadyPaid ? 'PAID' : status === 'SUCCESS' ? 'PAID' : status === 'FAILED' ? 'OVERDUE' : 'PENDING'

  // RACE-CONDITION: atomically claim the payment so concurrent webhook
  // deliveries (Kashier retries are common) cannot both pass the "not yet PAID"
  // check and double-run the subscription/wallet side-effects below. Only the
  // delivery whose conditional update actually changes a row proceeds.
  let updatedPayment = payment
  if (!wasAlreadyPaid) {
    const claimed = await db.payment.updateMany({
      where: { id: payment.id, status: payment.status },
      data: {
        status: newStatus,
        transactionId: transactionId ?? payment.transactionId,
        paidAt: status === 'SUCCESS' ? new Date() : null,
        notes: transactionId
          ? `${payment.notes ?? ''}\nKashier transaction: ${transactionId}`.trim()
          : payment.notes,
      },
    })

    if (claimed.count === 0) {
      // Another concurrent delivery already transitioned this payment; treat as
      // idempotent and do not re-run side-effects.
      return successResponse({ received: true, idempotent: true })
    }

    const refreshed = await db.payment.findUnique({ where: { id: payment.id } })
    if (refreshed) updatedPayment = refreshed
  }

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
      const validCycles = new Set(['MONTHLY', 'YEARLY'])
      const hasWalletSplitMetadata = notes.includes('WALLET_CONTRIBUTION:') || notes.includes('SUBSCRIPTION_TOTAL:')

      // SECURITY: apply subscription effects at most once. Rely solely on the
      // durable SUBSCRIPTION_APPLIED marker + not-already-paid; the previous
      // `|| hasWalletSplitMetadata` bypass allowed a replayed webhook to
      // re-debit the wallet and extend the subscription an extra cycle.
      void hasWalletSplitMetadata
      if (planRaw && validCycles.has(cycleRaw) && !hasSubscriptionApplied(notes) && !wasAlreadyPaid) {
        const walletContribution = getNoteNumber(notes, 'WALLET_CONTRIBUTION')
        if (walletContribution > 0) {
          const payeeUserId = await resolveTenantPayeeUserId(updatedPayment.tenantId)
          await debitUserWallet({
            tenantId: updatedPayment.tenantId,
            userId: payeeUserId,
            amount: walletContribution,
            reason: `Subscription wallet contribution - ${planRaw}`,
            relatedPaymentId: updatedPayment.id,
            metadata: {
              source: 'TEACHER_SUBSCRIPTION',
              plan: planRaw,
              cycle: cycleRaw,
              totalAmount: getNoteNumber(notes, 'SUBSCRIPTION_TOTAL') || updatedPayment.amount,
              walletContribution,
              kashierAmount: getNoteNumber(notes, 'KASHIER_AMOUNT') || updatedPayment.amount,
              orderId,
            },
          })
        }

        await activateOrRenewSubscriptionForTenant(
          updatedPayment.tenantId,
          planRaw,
          cycleRaw as 'MONTHLY' | 'YEARLY',
        )

        await db.payment.update({
          where: { id: updatedPayment.id },
          data: { notes: appendSubscriptionApplied(notes) },
        })
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

