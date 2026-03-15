import { PaymentStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { getCurrentMonthKey } from '@/lib/utils'

function buildPaymentStatusMap<
  TPayment extends {
    studentId: string
    status: PaymentStatus
  },
>(payments: TPayment[]) {
  return payments.reduce<Record<string, PaymentStatus[]>>((accumulator, payment) => {
    accumulator[payment.studentId] ??= []
    accumulator[payment.studentId].push(payment.status)
    return accumulator
  }, {})
}

export function resolvePaymentStatus(statuses: PaymentStatus[]) {
  if (statuses.includes(PaymentStatus.OVERDUE)) {
    return PaymentStatus.OVERDUE
  }

  if (statuses.includes(PaymentStatus.PENDING)) {
    return PaymentStatus.PENDING
  }

  if (statuses.includes(PaymentStatus.PARTIAL)) {
    return PaymentStatus.PARTIAL
  }

  if (statuses.includes(PaymentStatus.PAID)) {
    return PaymentStatus.PAID
  }

  return PaymentStatus.PENDING
}

export async function getCurrentMonthPaymentStatusMap(
  tenantId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) {
    return {}
  }

  const payments = await db.payment.findMany({
    where: {
      tenantId,
      month: getCurrentMonthKey(),
      studentId: {
        in: studentIds,
      },
    },
    select: {
      studentId: true,
      status: true,
    },
  })

  return buildPaymentStatusMap(payments)
}

export async function getStudentPaymentHistory(
  tenantId: string,
  studentId: string,
) {
  return db.payment.findMany({
    where: {
      tenantId,
      studentId,
    },
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
  })
}
