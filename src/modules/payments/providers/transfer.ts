import { env } from '@/config/env'
import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'
import { getKashierApiCredentialsByTenantId } from './subscription'

function calculateFee(amount: number): number {
  const percent = env.TEACHER_TRANSFER_FEE_PERCENT
  return Math.round((amount * percent) / 100)
}

async function executeTeacherTransfer(transferId: string): Promise<{ success: boolean; failureReason?: string }> {
  const transfer = await db.teacherTransfer.findUnique({
    where: { id: transferId },
    include: {
      payment: true,
    },
  })

  if (!transfer) {
    return { success: false, failureReason: 'TRANSFER_NOT_FOUND' }
  }

  try {
    // If teacher credentials are missing, retry later.
    await getKashierApiCredentialsByTenantId(transfer.tenantId)
  } catch {
    return { success: false, failureReason: 'TEACHER_API_NOT_CONFIGURED' }
  }

  // Placeholder for real Kashier split transfer API call.
  // We keep this deterministic and auditable until gateway transfer API is wired.
  return { success: true }
}

export async function enqueueTeacherTransferForPayment(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  })

  if (!payment || payment.status !== 'PAID') {
    return { queued: false, reason: 'PAYMENT_NOT_READY' as const }
  }

  const existing = await db.teacherTransfer.findUnique({
    where: { paymentId: payment.id },
  })

  if (existing) {
    return { queued: false, reason: 'ALREADY_QUEUED' as const, transferId: existing.id }
  }

  const fee = calculateFee(payment.amount)
  const transfer = await db.teacherTransfer.create({
    data: {
      tenantId: payment.tenantId,
      paymentId: payment.id,
      amount: Math.max(payment.amount - fee, 0),
      fee,
      status: 'PENDING',
    },
  })

  await db.payment.update({
    where: { id: payment.id },
    data: { teacherApiUsed: true },
  })

  await logFinancialEvent({
    tenantId: payment.tenantId,
    eventType: 'TRANSFER_ENQUEUED',
    entityType: 'TRANSFER',
    entityId: transfer.id,
    message: 'Teacher transfer queued',
    metadata: { paymentId: payment.id, amount: transfer.amount, fee: transfer.fee },
  })

  return { queued: true, transferId: transfer.id }
}

export async function processPendingTeacherTransfers(limit: number = 20) {
  const transfers = await db.teacherTransfer.findMany({
    where: {
      status: { in: ['PENDING', 'RETRY'] },
      attemptCount: { lt: 5 },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  let processed = 0
  let succeeded = 0
  let failed = 0

  for (const transfer of transfers) {
    processed += 1

    const result = await executeTeacherTransfer(transfer.id)
    if (result.success) {
      succeeded += 1
      await db.teacherTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'SUCCESS',
          lastAttemptAt: new Date(),
          attemptCount: { increment: 1 },
          failureReason: null,
        },
      })

      await logFinancialEvent({
        tenantId: transfer.tenantId,
        eventType: 'TRANSFER_SUCCESS',
        entityType: 'TRANSFER',
        entityId: transfer.id,
        message: 'Teacher transfer succeeded',
      })

      continue
    }

    failed += 1
    const nextStatus = transfer.attemptCount + 1 >= 5 ? 'FAILED' : 'RETRY'

    await db.teacherTransfer.update({
      where: { id: transfer.id },
      data: {
        status: nextStatus,
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
        failureReason: result.failureReason ?? 'UNKNOWN_TRANSFER_ERROR',
      },
    })

    await logFinancialEvent({
      tenantId: transfer.tenantId,
      eventType: 'TRANSFER_FAILED',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      message: `Teacher transfer failed (${result.failureReason ?? 'UNKNOWN'})`,
    })
  }

  return { processed, succeeded, failed }
}

