import { env } from '@/config/env'
import { UserRole, type Prisma, type WalletTransactionType } from '@/generated/client'
import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'

type TxClient = Prisma.TransactionClient
type DbClient = typeof db | TxClient

const TENANT_STUDENT_ACCESS_STATUSES = ['ACTIVE', 'WAITLIST', 'PENDING'] as const
const TENANT_PAYEE_PRIORITY: UserRole[] = [
  UserRole.CENTER_ADMIN,
  UserRole.TEACHER,
  UserRole.ADMIN,
  UserRole.MANAGER,
]

export function calculatePlatformFee(amount: number) {
  return Math.round((amount * env.TEACHER_TRANSFER_FEE_PERCENT) / 100)
}

function assertPositiveAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Amount must be a positive integer')
  }
}

function toJson(metadata?: Record<string, unknown>) {
  return metadata as Prisma.InputJsonValue | undefined
}

export async function getOrCreateWallet(tenantId: string, userId: string, tx: DbClient = db) {
  return tx.userWallet.upsert({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    update: {},
    create: {
      tenantId,
      userId,
      balance: 0,
    },
  })
}

export async function resolveTenantPayeeUserId(tenantId: string, tx: DbClient = db) {
  const users = await tx.user.findMany({
    where: {
      tenantId,
      role: { in: TENANT_PAYEE_PRIORITY },
      isActive: true,
    },
    select: { id: true, role: true },
  })

  for (const role of TENANT_PAYEE_PRIORITY) {
    const user = users.find((item) => item.role === role)
    if (user) return user.id
  }

  throw new Error('لا يوجد حساب معلم/سنتر نشط لاستقبال الرصيد')
}

export async function resolveStudentWalletPayer(studentId: string, tenantId: string, tx: DbClient = db) {
  const student = await tx.user.findFirst({
    where: {
      id: studentId,
      role: UserRole.STUDENT,
      isActive: true,
      groupStudents: {
        some: {
          status: { in: [...TENANT_STUDENT_ACCESS_STATUSES] },
          group: { tenantId },
        },
      },
    },
    select: {
      id: true,
      parentStudents: {
        select: { parentId: true },
        take: 1,
      },
    },
  })

  if (!student) throw new Error('الطالب غير موجود ضمن مجموعات هذا الحساب')

  const parentId = student.parentStudents[0]?.parentId
  return {
    payerType: parentId ? ('PARENT' as const) : ('STUDENT' as const),
    payerUserId: parentId ?? student.id,
    studentId: student.id,
  }
}

export async function resolveRechargeWalletOwner(userId: string, tenantId: string, tx: DbClient = db) {
  const user = await tx.user.findFirst({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      role: true,
      parentStudents: {
        select: { parentId: true },
        take: 1,
      },
    },
  })

  if (!user) throw new Error('المستخدم غير موجود')

  if (user.role === UserRole.PARENT) {
    return { ownerType: 'PARENT' as const, ownerUserId: user.id }
  }

  if (user.role === UserRole.STUDENT) {
    const { payerType, payerUserId } = await resolveStudentWalletPayer(user.id, tenantId, tx)
    return { ownerType: payerType, ownerUserId: payerUserId }
  }

  return { ownerType: 'USER' as const, ownerUserId: user.id }
}

export async function creditUserWallet(input: {
  tenantId: string
  userId: string
  amount: number
  reason: string
  type?: WalletTransactionType
  relatedPaymentId?: string
  relatedTransferId?: string
  relatedWithdrawalId?: string
  createdById?: string | null
  metadata?: Record<string, unknown>
  tx?: TxClient
}) {
  assertPositiveAmount(input.amount)

  const run = async (tx: TxClient) => {
    const wallet = await getOrCreateWallet(input.tenantId, input.userId, tx)

    const type = input.type ?? 'CREDIT'
    const existing = await tx.walletTransaction.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        type,
        status: 'COMPLETED',
        ...(input.relatedPaymentId ? { relatedPaymentId: input.relatedPaymentId } : {}),
        ...(input.relatedTransferId ? { relatedTransferId: input.relatedTransferId } : {}),
        ...(input.relatedWithdrawalId ? { relatedWithdrawalId: input.relatedWithdrawalId } : {}),
      },
    })

    if ((input.relatedPaymentId || input.relatedTransferId || input.relatedWithdrawalId) && existing) {
      return { wallet, transaction: existing }
    }

    const updatedWallet = await tx.userWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: input.amount } },
    })

    const transaction = await tx.walletTransaction.create({
      data: {
        tenantId: input.tenantId,
        walletId: wallet.id,
        userId: input.userId,
        type,
        amount: input.amount,
        reason: input.reason,
        relatedPaymentId: input.relatedPaymentId,
        relatedTransferId: input.relatedTransferId,
        relatedWithdrawalId: input.relatedWithdrawalId,
        createdById: input.createdById ?? null,
        metadata: toJson(input.metadata),
      },
    })

    return { wallet: updatedWallet, transaction }
  }

  const result = input.tx ? await run(input.tx) : await db.$transaction(run)

  if (!input.tx) {
    await logFinancialEvent({
      tenantId: input.tenantId,
      actorId: input.createdById ?? null,
      eventType: 'BALANCE_CREDIT',
      entityType: 'BALANCE_TRANSACTION',
      entityId: result.transaction.id,
      message: `Wallet credited by ${input.amount} EGP`,
      metadata: {
        userId: input.userId,
        relatedPaymentId: input.relatedPaymentId,
        relatedTransferId: input.relatedTransferId,
        relatedWithdrawalId: input.relatedWithdrawalId,
      },
    })
  }

  return result
}

export async function debitUserWallet(input: {
  tenantId: string
  userId: string
  amount: number
  reason: string
  type?: WalletTransactionType
  relatedPaymentId?: string
  relatedTransferId?: string
  relatedWithdrawalId?: string
  createdById?: string | null
  metadata?: Record<string, unknown>
  tx?: TxClient
}) {
  assertPositiveAmount(input.amount)
  const type = input.type ?? 'DEBIT'

  const run = async (tx: TxClient) => {
    const wallet = await getOrCreateWallet(input.tenantId, input.userId, tx)

    const existing = await tx.walletTransaction.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        type,
        status: 'COMPLETED',
        ...(input.relatedPaymentId ? { relatedPaymentId: input.relatedPaymentId } : {}),
        ...(input.relatedTransferId ? { relatedTransferId: input.relatedTransferId } : {}),
        ...(input.relatedWithdrawalId ? { relatedWithdrawalId: input.relatedWithdrawalId } : {}),
      },
    })

    if ((input.relatedPaymentId || input.relatedTransferId || input.relatedWithdrawalId) && existing) {
      return { wallet, transaction: existing }
    }

    const updated = await tx.userWallet.updateMany({
      where: {
        id: wallet.id,
        balance: { gte: input.amount },
      },
      data: {
        balance: { decrement: input.amount },
      },
    })

    if (updated.count === 0) {
      throw new Error(`Insufficient balance. Available: ${wallet.balance} EGP`)
    }

    const updatedWallet = await tx.userWallet.findUniqueOrThrow({ where: { id: wallet.id } })
    const transaction = await tx.walletTransaction.create({
      data: {
        tenantId: input.tenantId,
        walletId: wallet.id,
        userId: input.userId,
        type,
        amount: input.amount,
        reason: input.reason,
        relatedPaymentId: input.relatedPaymentId,
        relatedTransferId: input.relatedTransferId,
        relatedWithdrawalId: input.relatedWithdrawalId,
        createdById: input.createdById ?? null,
        metadata: toJson(input.metadata),
      },
    })

    return { wallet: updatedWallet, transaction }
  }

  const result = input.tx ? await run(input.tx) : await db.$transaction(run)

  if (!input.tx) {
    await logFinancialEvent({
      tenantId: input.tenantId,
      actorId: input.createdById ?? null,
      eventType: 'BALANCE_DEBIT',
      entityType: 'BALANCE_TRANSACTION',
      entityId: result.transaction.id,
      message: `Wallet debited by ${input.amount} EGP`,
      metadata: {
        userId: input.userId,
        relatedPaymentId: input.relatedPaymentId,
        relatedTransferId: input.relatedTransferId,
        relatedWithdrawalId: input.relatedWithdrawalId,
        type,
      },
    })
  }

  return result
}

export async function transferBetweenWallets(input: {
  tenantId: string
  fromUserId: string
  toUserId: string
  amount: number
  reason: string
  relatedPaymentId?: string
  createdById?: string | null
  metadata?: Record<string, unknown>
}) {
  assertPositiveAmount(input.amount)

  return db.$transaction(async (tx) => {
    const debit = await debitUserWallet({
      tenantId: input.tenantId,
      userId: input.fromUserId,
      amount: input.amount,
      reason: input.reason,
      relatedPaymentId: input.relatedPaymentId,
      createdById: input.createdById,
      metadata: input.metadata,
      tx,
    })

    const credit = await creditUserWallet({
      tenantId: input.tenantId,
      userId: input.toUserId,
      amount: input.amount,
      reason: input.reason,
      relatedPaymentId: input.relatedPaymentId,
      createdById: input.createdById,
      metadata: input.metadata,
      tx,
    })

    return { debit, credit }
  })
}

export async function getWalletSummary(tenantId: string, userId: string) {
  const wallet = await getOrCreateWallet(tenantId, userId)
  return wallet
}

export async function getWalletTransactions(tenantId: string, userId: string, limit: number = 50) {
  const wallet = await getOrCreateWallet(tenantId, userId)
  return db.walletTransaction.findMany({
    where: { tenantId, walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
