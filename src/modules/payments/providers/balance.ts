'use server'

import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'
import { requireTenant } from '@/lib/tenant'

type WalletOwnerType = 'STUDENT' | 'PARENT'

async function resolveWalletOwner(studentId: string, tenantId: string, tx: any = db) {
  const student = await tx.user.findFirst({
    where: { id: studentId, tenantId, role: 'STUDENT' },
    select: {
      id: true,
      parentStudents: {
        select: { parentId: true },
        take: 1,
      },
    },
  })

  if (!student) throw new Error('Student not found')

  const parentId = student.parentStudents[0]?.parentId

  if (parentId) {
    return {
      ownerType: 'PARENT' as WalletOwnerType,
      ownerId: parentId,
      studentId,
    }
  }

  return {
    ownerType: 'STUDENT' as WalletOwnerType,
    ownerId: student.id,
    studentId,
  }
}

export async function getStudentBalance(studentId: string, tenantId: string) {
  const { ownerType, ownerId } = await resolveWalletOwner(studentId, tenantId)
  const balance = await db.studentBalance.findUnique({
    where: {
      tenantId_studentId: {
        tenantId,
        studentId: ownerId,
      },
    },
  })

  return { balance, owner: ownerType, ownerId }
}

export async function debitBalance(
  studentId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  const tenant = await requireTenant()
  return debitBalanceForTenant(tenant.id, studentId, amount, reason, relatedPaymentId)
}

export async function debitBalanceForTenant(
  tenantId: string,
  studentId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero')
  }

  const result = await db.$transaction(async (tx) => {
    const { ownerId } = await resolveWalletOwner(studentId, tenantId, tx)

    const wallet = await tx.studentBalance.upsert({
      where: {
        tenantId_studentId: {
          tenantId,
          studentId: ownerId,
        },
      },
      update: {},
      create: {
        tenantId,
        studentId: ownerId,
        balance: 0,
      },
    })

    if (wallet.balance < amount) {
      throw new Error(`Insufficient balance. Available: ${wallet.balance} EGP`)
    }

    if (relatedPaymentId) {
      const existingTx = await tx.balanceTransaction.findFirst({
        where: {
          tenantId,
          relatedPaymentId,
          type: 'DEBIT',
          status: 'COMPLETED',
        },
      })

      if (existingTx) {
        return { balance: wallet, transaction: existingTx }
      }
    }

    const updateRes = await tx.studentBalance.updateMany({
      where: {
        id: wallet.id,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
      },
    })

    if (updateRes.count === 0) {
      throw new Error('Concurrent balance update detected')
    }

    const updatedBalance = await tx.studentBalance.findUniqueOrThrow({
      where: { id: wallet.id },
    })

    const transaction = await tx.balanceTransaction.create({
      data: {
        tenantId,
        balanceId: wallet.id,
        type: 'DEBIT',
        amount,
        reason,
        relatedPaymentId,
        status: 'COMPLETED',
      },
    })

    return { balance: updatedBalance, transaction }
  })

  await logFinancialEvent({
    tenantId,
    eventType: 'BALANCE_DEBIT',
    entityType: 'BALANCE_TRANSACTION',
    entityId: result.transaction.id,
    message: `Balance debited by ${amount} EGP`,
    metadata: { studentId, relatedPaymentId },
  })

  return result
}

export async function creditBalance(
  userId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  const tenant = await requireTenant()
  return creditBalanceForTenant(tenant.id, userId, amount, reason, relatedPaymentId)
}

export async function creditBalanceForTenant(
  tenantId: string,
  userId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero')
  }

  const result = await db.$transaction(async (tx) => {
    const wallet = await tx.studentBalance.upsert({
      where: {
        tenantId_studentId: {
          tenantId,
          studentId: userId,
        },
      },
      update: {},
      create: {
        tenantId,
        studentId: userId,
        balance: 0,
      },
    })

    if (relatedPaymentId) {
      const existingTx = await tx.balanceTransaction.findFirst({
        where: {
          tenantId,
          relatedPaymentId,
          type: 'CREDIT',
          status: 'COMPLETED',
        },
      })

      if (existingTx) {
        return { balance: wallet, transaction: existingTx }
      }
    }

    const updatedBalance = await tx.studentBalance.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: amount },
        lastRechargedAt: new Date(),
      },
    })

    const transaction = await tx.balanceTransaction.create({
      data: {
        tenantId,
        balanceId: wallet.id,
        type: 'CREDIT',
        amount,
        reason,
        relatedPaymentId,
        status: 'COMPLETED',
      },
    })

    return { balance: updatedBalance, transaction }
  })

  await logFinancialEvent({
    tenantId,
    eventType: 'BALANCE_CREDIT',
    entityType: 'BALANCE_TRANSACTION',
    entityId: result.transaction.id,
    message: `Balance credited by ${amount} EGP`,
    metadata: { userId, relatedPaymentId },
  })

  return result
}

export async function getBalanceTransactions(studentId: string, limit: number = 50) {
  const tenant = await requireTenant()
  const { ownerId } = await resolveWalletOwner(studentId, tenant.id)

  const balance = await db.studentBalance.findUnique({
    where: {
      tenantId_studentId: {
        tenantId: tenant.id,
        studentId: ownerId,
      },
    },
  })

  if (!balance) return []

  return db.balanceTransaction.findMany({
    where: {
      tenantId: tenant.id,
      balanceId: balance.id,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getTeacherMonthlyIncome(month: string) {
  const tenant = await requireTenant()

  const income = await db.payment.aggregate({
    where: {
      tenantId: tenant.id,
      month,
      status: 'PAID',
    },
    _sum: {
      amount: true,
    },
  })

  return income._sum.amount ?? 0
}


