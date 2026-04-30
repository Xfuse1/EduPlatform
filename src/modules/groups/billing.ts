import type { Prisma } from '@/generated/client'

import { db } from '@/lib/db'
import { parseStoredGroupSchedule } from '@/modules/groups/schedule'
import {
  creditUserWallet,
  debitUserWallet,
  resolveStudentWalletPayer,
  resolveTenantPayeeUserId,
} from '@/modules/wallet/provider'

type TxClient = Prisma.TransactionClient

type BillingResult = {
  charged: boolean
  chargeId?: string
  amount?: number
}

function getCoveredSessions(group: { schedule: Prisma.JsonValue; days: string[]; timeStart: string; timeEnd: string }) {
  const schedule = parseStoredGroupSchedule(group.schedule, {
    days: group.days,
    timeStart: group.timeStart,
    timeEnd: group.timeEnd,
  })
  return Math.max(1, schedule.length) * 4
}

async function notifyInsufficientBalance(input: {
  tx: TxClient
  tenantId: string
  studentId: string
  payerUserId: string
  groupName: string
  amount: number
}) {
  const [student, parentLink] = await Promise.all([
    input.tx.user.findUnique({
      where: { id: input.studentId },
      select: { id: true, phone: true, parentPhone: true, name: true },
    }),
    input.tx.parentStudent.findFirst({
      where: { studentId: input.studentId },
      select: { parentId: true, parent: { select: { phone: true } } },
    }),
  ])

  const message = `الرصيد غير كافٍ لخصم ${input.amount} ج.م لمجموعة ${input.groupName}. يرجى شحن المحفظة.`
  const notifications = [
    student
      ? {
          tenantId: input.tenantId,
          userId: student.id,
          type: 'PAYMENT_OVERDUE' as const,
          message,
          channel: 'PUSH' as const,
          recipientPhone: student.phone ?? '',
          status: 'QUEUED' as const,
        }
      : null,
    parentLink
      ? {
          tenantId: input.tenantId,
          userId: parentLink.parentId,
          type: 'PAYMENT_OVERDUE' as const,
          message,
          channel: 'PUSH' as const,
          recipientPhone: parentLink.parent.phone ?? student?.parentPhone ?? '',
          status: 'QUEUED' as const,
        }
      : null,
  ].filter(Boolean) as Array<Prisma.NotificationCreateManyInput>

  if (notifications.length > 0) {
    await input.tx.notification.createMany({ data: notifications })
  }
}

async function createWalletCharge(input: {
  tx: TxClient
  tenantId: string
  groupId: string
  studentId: string
  amount: number
  billingType: 'MONTHLY' | 'PER_SESSION' | 'FULL_COURSE'
  reason: string
  idempotencyKey: string
  relatedSessionId?: string
  coveredSessions?: number
  groupName: string
}) {
  const existing = await input.tx.groupBillingCharge.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  })
  if (existing?.status === 'COMPLETED') {
    return { charged: false, chargeId: existing.id, amount: existing.amount } satisfies BillingResult
  }

  if (input.amount <= 0) {
    return { charged: false, amount: 0 } satisfies BillingResult
  }

  const payer = await resolveStudentWalletPayer(input.studentId, input.tenantId, input.tx)
  const payeeUserId = await resolveTenantPayeeUserId(input.tenantId, input.tx)

  try {
    const debit = await debitUserWallet({
      tenantId: input.tenantId,
      userId: payer.payerUserId,
      amount: input.amount,
      reason: input.reason,
      type: 'DEBIT',
      metadata: {
        source: 'GROUP_BILLING',
        groupId: input.groupId,
        studentId: input.studentId,
        billingType: input.billingType,
        relatedSessionId: input.relatedSessionId,
      },
      tx: input.tx,
    })
    const credit = await creditUserWallet({
      tenantId: input.tenantId,
      userId: payeeUserId,
      amount: input.amount,
      reason: input.reason,
      type: 'CREDIT',
      metadata: {
        source: 'GROUP_BILLING',
        groupId: input.groupId,
        studentId: input.studentId,
        billingType: input.billingType,
        relatedSessionId: input.relatedSessionId,
      },
      tx: input.tx,
    })

    const charge = await input.tx.groupBillingCharge.create({
      data: {
        tenantId: input.tenantId,
        groupId: input.groupId,
        studentId: input.studentId,
        payerUserId: payer.payerUserId,
        payeeUserId,
        amount: input.amount,
        billingType: input.billingType,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        relatedSessionId: input.relatedSessionId,
        walletDebitTxId: debit.transaction.id,
        walletCreditTxId: credit.transaction.id,
        coveredSessions: input.coveredSessions,
      },
    })

    return { charged: true, chargeId: charge.id, amount: charge.amount } satisfies BillingResult
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient balance')) {
      await notifyInsufficientBalance({
        tx: input.tx,
        tenantId: input.tenantId,
        studentId: input.studentId,
        payerUserId: payer.payerUserId,
        groupName: input.groupName,
        amount: input.amount,
      })
      throw new Error('رصيد المحفظة غير كافٍ. تم إشعار الطالب وولي الأمر.')
    }

    throw error
  }
}

export async function chargeGroupEnrollmentIfNeeded(input: {
  tenantId: string
  groupId: string
  studentId: string
  tx: TxClient
}) {
  const group = await input.tx.group.findFirst({
    where: { id: input.groupId, tenantId: input.tenantId },
    select: {
      id: true,
      name: true,
      billingType: true,
      monthlyFee: true,
      schedule: true,
      days: true,
      timeStart: true,
      timeEnd: true,
    },
  })

  if (!group || group.billingType === 'PER_SESSION') return { charged: false } satisfies BillingResult

  const coveredSessions = group.billingType === 'MONTHLY' ? getCoveredSessions(group) : undefined
  const reason = group.billingType === 'FULL_COURSE'
    ? `اشتراك الكورس الكامل - ${group.name}`
    : `اشتراك شهري - ${group.name}`

  return createWalletCharge({
    tx: input.tx,
    tenantId: input.tenantId,
    groupId: input.groupId,
    studentId: input.studentId,
    amount: group.monthlyFee,
    billingType: group.billingType,
    reason,
    idempotencyKey: `enrollment:${group.billingType}:${input.groupId}:${input.studentId}`,
    coveredSessions,
    groupName: group.name,
  })
}

export async function ensureQrBillingBeforeAttendance(input: {
  tenantId: string
  sessionId: string
  studentId: string
  tx: TxClient
}) {
  const session = await input.tx.session.findFirst({
    where: { id: input.sessionId, tenantId: input.tenantId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          billingType: true,
          monthlyFee: true,
          schedule: true,
          days: true,
          timeStart: true,
          timeEnd: true,
        },
      },
    },
  })

  if (!session) throw new Error('الحصة غير موجودة.')
  const group = session.group
  if (group.billingType === 'FULL_COURSE') return { charged: false } satisfies BillingResult

  if (group.billingType === 'PER_SESSION') {
    return createWalletCharge({
      tx: input.tx,
      tenantId: input.tenantId,
      groupId: group.id,
      studentId: input.studentId,
      amount: group.monthlyFee,
      billingType: 'PER_SESSION',
      reason: `حضور حصة - ${group.name}`,
      idempotencyKey: `session:${input.sessionId}:${input.studentId}`,
      relatedSessionId: input.sessionId,
      groupName: group.name,
    })
  }

  const coveredSessions = getCoveredSessions(group)
  const latestCharge = await input.tx.groupBillingCharge.findFirst({
    where: {
      tenantId: input.tenantId,
      groupId: group.id,
      studentId: input.studentId,
      billingType: 'MONTHLY',
      status: 'COMPLETED',
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!latestCharge || latestCharge.consumedSessions >= (latestCharge.coveredSessions ?? coveredSessions)) {
    return createWalletCharge({
      tx: input.tx,
      tenantId: input.tenantId,
      groupId: group.id,
      studentId: input.studentId,
      amount: group.monthlyFee,
      billingType: 'MONTHLY',
      reason: `تجديد اشتراك شهري - ${group.name}`,
      idempotencyKey: `monthly:${group.id}:${input.studentId}:${Date.now()}`,
      relatedSessionId: input.sessionId,
      coveredSessions,
      groupName: group.name,
    })
  }

  return { charged: false, chargeId: latestCharge.id, amount: latestCharge.amount } satisfies BillingResult
}

export async function incrementMonthlyConsumption(input: {
  tenantId: string
  groupId: string
  studentId: string
  tx: TxClient
}) {
  const latestCharge = await input.tx.groupBillingCharge.findFirst({
    where: {
      tenantId: input.tenantId,
      groupId: input.groupId,
      studentId: input.studentId,
      billingType: 'MONTHLY',
      status: 'COMPLETED',
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (!latestCharge) return

  await input.tx.groupBillingCharge.update({
    where: { id: latestCharge.id },
    data: { consumedSessions: { increment: 1 } },
  })
}
