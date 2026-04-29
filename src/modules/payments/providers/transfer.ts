import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'
import {
  calculatePlatformFee,
  creditUserWallet,
  debitUserWallet,
  getOrCreateWallet,
  resolveTenantPayeeUserId,
} from '@/modules/wallet/provider'
import { getKashierApiCredentialsByTenantId } from './subscription'

type PaymentForSettlement = {
  id: string
  tenantId: string
  amount: number
  status: string
  notes: string | null
  receiptNumber: string | null
}

function isTuitionSettlementPayment(payment: PaymentForSettlement) {
  const notes = payment.notes ?? ''
  const receiptNumber = payment.receiptNumber ?? ''

  return !(
    receiptNumber.startsWith('RCH-') ||
    receiptNumber.startsWith('SUBK-') ||
    notes.startsWith('RECHARGE:') ||
    notes.startsWith('SUBSCRIPTION:')
  )
}

async function callKashierTransferApi(params: {
  withdrawalId: string
  amount: number
  teacherMerId: string
  teacherApiKey: string
}): Promise<{ success: boolean; transactionId?: string; failureReason?: string }> {
  // TODO: wire Kashier's real transfer/disbursement endpoint when it is available.
  void params
  return { success: false, failureReason: 'KASHIER_TRANSFER_API_PENDING_INTEGRATION' }
}

export async function settleTeacherPaymentToWallet(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      tenantId: true,
      amount: true,
      status: true,
      notes: true,
      receiptNumber: true,
    },
  })

  if (!payment || payment.status !== 'PAID') {
    return { settled: false, reason: 'PAYMENT_NOT_READY' as const }
  }

  if (!isTuitionSettlementPayment(payment)) {
    return { settled: false, reason: 'NOT_TUITION_PAYMENT' as const }
  }

  const teacherUserId = await resolveTenantPayeeUserId(payment.tenantId)
  const fee = calculatePlatformFee(payment.amount)
  const netAmount = Math.max(payment.amount - fee, 0)

  if (netAmount <= 0) {
    return { settled: false, reason: 'ZERO_NET_AMOUNT' as const }
  }

  const result = await creditUserWallet({
    tenantId: payment.tenantId,
    userId: teacherUserId,
    amount: netAmount,
    reason: 'Teacher wallet settlement from payment',
    relatedPaymentId: payment.id,
    metadata: { grossAmount: payment.amount, fee },
  })

  return { settled: true, walletId: result.wallet.id, transactionId: result.transaction.id }
}

export async function reconcileTeacherWalletsFromPaidPayments(input?: { tenantId?: string; limit?: number }) {
  const payments = await db.payment.findMany({
    where: {
      ...(input?.tenantId ? { tenantId: input.tenantId } : {}),
      status: 'PAID',
      walletTransactions: {
        none: {
          type: 'CREDIT',
        },
      },
      NOT: [
        { receiptNumber: { startsWith: 'RCH-' } },
        { receiptNumber: { startsWith: 'SUBK-' } },
        { notes: { startsWith: 'RECHARGE:' } },
        { notes: { startsWith: 'SUBSCRIPTION:' } },
      ],
    },
    select: { id: true },
    orderBy: { paidAt: 'asc' },
    take: Math.min(Math.max(input?.limit ?? 100, 1), 500),
  })

  let settled = 0
  let skipped = 0

  for (const payment of payments) {
    const result = await settleTeacherPaymentToWallet(payment.id)
    if (result.settled) settled += 1
    else skipped += 1
  }

  return { processed: payments.length, settled, skipped }
}

export async function requestTeacherKashierWithdrawal(input: {
  tenantId: string
  userId: string
  amount: number
}) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('المبلغ يجب أن يكون رقمًا صحيحًا موجبًا')
  }

  const credentials = await getKashierApiCredentialsByTenantId(input.tenantId)
  const wallet = await getOrCreateWallet(input.tenantId, input.userId)

  if (wallet.balance < input.amount) {
    throw new Error('الرصيد غير كافٍ لإتمام السحب')
  }

  const withdrawal = await db.walletWithdrawal.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      walletId: wallet.id,
      amount: input.amount,
      method: 'KASHIER',
      status: 'PENDING',
      attemptCount: 1,
    },
  })

  const transferResult: { success: boolean; transactionId?: string; failureReason?: string } = await callKashierTransferApi({
    withdrawalId: withdrawal.id,
    amount: input.amount,
    teacherMerId: credentials.merId,
    teacherApiKey: credentials.apiKey,
  }).catch((error) => ({
    success: false,
    failureReason: error instanceof Error ? error.message : 'KASHIER_TRANSFER_API_ERROR',
  }))

  if (!transferResult.success) {
    const failedWithdrawal = await db.walletWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'FAILED',
        failureReason: transferResult.failureReason ?? 'KASHIER_TRANSFER_FAILED',
        processedAt: new Date(),
      },
    })

    await logFinancialEvent({
      tenantId: input.tenantId,
      eventType: 'TRANSFER_FAILED',
      entityType: 'TRANSFER',
      entityId: failedWithdrawal.id,
      message: `Wallet withdrawal failed (${failedWithdrawal.failureReason ?? 'UNKNOWN'})`,
    })

    return { success: false as const, withdrawal: failedWithdrawal }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      await debitUserWallet({
        tenantId: input.tenantId,
        userId: input.userId,
        amount: input.amount,
        reason: 'Teacher wallet withdrawal via Kashier',
        type: 'PAYOUT',
        relatedWithdrawalId: withdrawal.id,
        tx,
      })

      return tx.walletWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'SUCCESS',
          transactionId: transferResult.transactionId ?? withdrawal.id,
          processedAt: new Date(),
          failureReason: null,
        },
      })
    })

    await logFinancialEvent({
      tenantId: input.tenantId,
      eventType: 'TRANSFER_SUCCESS',
      entityType: 'TRANSFER',
      entityId: result.id,
      message: 'Wallet withdrawal succeeded',
    })

    return { success: true as const, withdrawal: result }
  } catch (error) {
    const failedWithdrawal = await db.walletWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : 'PAYOUT_WALLET_DEBIT_FAILED',
        processedAt: new Date(),
      },
    })

    await logFinancialEvent({
      tenantId: input.tenantId,
      eventType: 'TRANSFER_FAILED',
      entityType: 'TRANSFER',
      entityId: failedWithdrawal.id,
      message: `Wallet withdrawal failed (${failedWithdrawal.failureReason ?? 'UNKNOWN'})`,
    })

    return { success: false as const, withdrawal: failedWithdrawal }
  }
}

export async function processPendingTeacherTransfers(_limit: number = 20) {
  return { processed: 0, succeeded: 0, failed: 0, skipped: 'TEACHER_TRANSFERS_ARE_MANUAL_WITHDRAWALS' }
}
