import { EnrollmentStatus, PaymentStatus, UserRole } from '@prisma/client'

import { db } from '@/lib/db'

const ACTIVE_GROUP_STATUSES = [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLIST]

function getCurrentMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Africa/Cairo',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value

  return `${year}-${month}`
}

function resolvePaymentStatus(statuses: PaymentStatus[]) {
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

export async function getGroups(tenantId: string) {
  const groups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: [
      { subject: 'asc' },
      { gradeLevel: 'asc' },
      { name: 'asc' },
    ],
    include: {
      students: {
        where: {
          status: EnrollmentStatus.ACTIVE,
          student: {
            tenantId,
            role: UserRole.STUDENT,
            isActive: true,
          },
        },
        select: {
          id: true,
        },
      },
    },
  })

  return groups.map(({ students, ...group }) => ({
    ...group,
    studentCount: students.length,
  }))
}

export async function getGroupStudents(tenantId: string, groupId: string) {
  const enrollments = await db.groupStudent.findMany({
    where: {
      groupId,
      status: {
        in: ACTIVE_GROUP_STATUSES,
      },
      group: {
        id: groupId,
        tenantId,
      },
      student: {
        tenantId,
        role: UserRole.STUDENT,
        isActive: true,
      },
    },
    orderBy: [{ status: 'asc' }, { student: { name: 'asc' } }],
    include: {
      student: true,
    },
  })

  if (enrollments.length === 0) {
    return []
  }

  const payments = await db.payment.findMany({
    where: {
      tenantId,
      month: getCurrentMonthKey(),
      studentId: {
        in: enrollments.map((enrollment) => enrollment.studentId),
      },
    },
    select: {
      studentId: true,
      status: true,
    },
  })

  const paymentStatuses = payments.reduce<Record<string, PaymentStatus[]>>(
    (accumulator, payment) => {
      accumulator[payment.studentId] ??= []
      accumulator[payment.studentId].push(payment.status)
      return accumulator
    },
    {},
  )

  return enrollments.map((enrollment) => ({
    ...enrollment,
    paymentStatus: resolvePaymentStatus(
      paymentStatuses[enrollment.studentId] ?? [],
    ),
  }))
}

export async function getGroupById(tenantId: string, groupId: string) {
  const group = await db.group.findFirst({
    where: {
      id: groupId,
      tenantId,
    },
  })

  if (!group) {
    return null
  }

  const students = await getGroupStudents(tenantId, groupId)

  return {
    ...group,
    students,
  }
}
