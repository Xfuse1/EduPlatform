import { db } from '@/lib/db'

type FinancialEventType =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'BALANCE_CREDIT'
  | 'BALANCE_DEBIT'
  | 'TRANSFER_ENQUEUED'
  | 'TRANSFER_SUCCESS'
  | 'TRANSFER_FAILED'
  | 'SUBSCRIPTION_UPDATED'

type FinancialEntityType =
  | 'PAYMENT'
  | 'BALANCE'
  | 'BALANCE_TRANSACTION'
  | 'TRANSFER'
  | 'SUBSCRIPTION'

export async function logFinancialEvent(input: {
  tenantId: string
  actorId?: string | null
  eventType: FinancialEventType
  entityType: FinancialEntityType
  entityId?: string | null
  message: string
  metadata?: Record<string, unknown>
}) {
  // Audit writes must never break the primary financial path, so any failure
  // here is logged and swallowed rather than propagated to the caller.
  try {
    await db.financialAuditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId ?? null,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        message: input.message,
        metadata: (input.metadata as unknown as import('@/generated/client').Prisma.InputJsonValue) ?? undefined,
      },
    })
  } catch (error) {
    console.error('[FINANCIAL_AUDIT] Failed to write financial audit log', {
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      tenantId: input.tenantId,
      error,
    })
  }
}


