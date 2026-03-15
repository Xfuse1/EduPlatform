import {
  AttendanceStatus,
  EnrollmentStatus,
  PaymentStatus,
  UserRole,
} from '@prisma/client'

import { db } from '@/lib/db'

const ACTIVE_ENROLLMENT_STATUSES = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.WAITLIST,
]

const ATTENDED_STATUSES = [AttendanceStatus.PRESENT, AttendanceStatus.LATE]

type GetStudentsFilters = {
  search?: string
  groupId?: string
  paymentStatus?: PaymentStatus
}

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

function getAttendanceWindowStart(date = new Date()) {
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - 30)
  startDate.setHours(0, 0, 0, 0)
  return startDate
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

function buildStudentSearchFilter(search?: string) {
  const normalizedSearch = search?.trim()

  if (!normalizedSearch) {
    return undefined
  }

  return {
    name: {
      contains: normalizedSearch,
      mode: 'insensitive' as const,
    },
  }
}

function mapEnrollmentsToGroups<
  TEnrollment extends {
    id: string
    status: EnrollmentStatus
    enrolledAt: Date
    droppedAt: Date | null
    group: {
      id: string
      name: string
      subject: string
      gradeLevel: string
      days: string[]
      timeStart: string
      timeEnd: string
      room: string | null
      maxCapacity: number
      monthlyFee: number
      color: string
      isActive: boolean
      tenantId: string
      createdAt: Date
      updatedAt: Date
    }
  },
>(enrollments: TEnrollment[]) {
  return enrollments.map((enrollment) => ({
    ...enrollment.group,
    enrollmentId: enrollment.id,
    enrollmentStatus: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    droppedAt: enrollment.droppedAt,
  }))
}

function getStudentPaymentStatusMap<
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

async function getCurrentMonthPaymentStatusMap(
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

  return getStudentPaymentStatusMap(payments)
}

async function getAttendanceRateForStudent(tenantId: string, studentId: string) {
  const startDate = getAttendanceWindowStart()

  const [totalAttendanceRecords, attendedRecords] = await Promise.all([
    db.attendance.count({
      where: {
        tenantId,
        studentId,
        createdAt: {
          gte: startDate,
        },
      },
    }),
    db.attendance.count({
      where: {
        tenantId,
        studentId,
        createdAt: {
          gte: startDate,
        },
        status: {
          in: ATTENDED_STATUSES,
        },
      },
    }),
  ])

  if (totalAttendanceRecords === 0) {
    return 0
  }

  return Math.round((attendedRecords / totalAttendanceRecords) * 100)
}

export async function getStudents(
  tenantId: string,
  filters: GetStudentsFilters = {},
) {
  const students = await db.user.findMany({
    where: {
      tenantId,
      role: UserRole.STUDENT,
      isActive: true,
      ...buildStudentSearchFilter(filters.search),
      ...(filters.groupId
        ? {
            enrollments: {
              some: {
                groupId: filters.groupId,
                status: {
                  in: ACTIVE_ENROLLMENT_STATUSES,
                },
                group: {
                  tenantId,
                },
              },
            },
          }
        : {}),
    },
    orderBy: [{ name: 'asc' }],
    include: {
      enrollments: {
        where: {
          status: {
            in: ACTIVE_ENROLLMENT_STATUSES,
          },
          group: {
            tenantId,
          },
        },
        orderBy: [
          { status: 'asc' },
          { group: { subject: 'asc' } },
          { group: { name: 'asc' } },
        ],
        include: {
          group: true,
        },
      },
    },
  })

  if (students.length === 0) {
    return []
  }

  const paymentStatusMap = await getCurrentMonthPaymentStatusMap(
    tenantId,
    students.map((student) => student.id),
  )

  const mappedStudents = students.map(({ enrollments, ...student }) => ({
    ...student,
    groups: mapEnrollmentsToGroups(enrollments),
    paymentStatus: resolvePaymentStatus(paymentStatusMap[student.id] ?? []),
  }))

  if (!filters.paymentStatus) {
    return mappedStudents
  }

  return mappedStudents.filter(
    (student) => student.paymentStatus === filters.paymentStatus,
  )
}

export async function getStudentById(tenantId: string, studentId: string) {
  const student = await db.user.findFirst({
    where: {
      id: studentId,
      tenantId,
      role: UserRole.STUDENT,
    },
    include: {
      enrollments: {
        where: {
          group: {
            tenantId,
          },
        },
        orderBy: [
          { status: 'asc' },
          { group: { subject: 'asc' } },
          { group: { name: 'asc' } },
        ],
        include: {
          group: true,
        },
      },
      studentPayments: {
        where: {
          tenantId,
        },
        orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
      },
      attendanceRecords: {
        where: {
          tenantId,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
        include: {
          group: true,
          session: true,
        },
      },
    },
  })

  if (!student) {
    return null
  }

  return {
    ...student,
    groups: mapEnrollmentsToGroups(student.enrollments),
    paymentStatus: resolvePaymentStatus(
      student.studentPayments
        .filter((payment) => payment.month === getCurrentMonthKey())
        .map((payment) => payment.status),
    ),
  }
}

export async function getStudentProfile(tenantId: string, studentId: string) {
  const student = await db.user.findFirst({
    where: {
      id: studentId,
      tenantId,
      role: UserRole.STUDENT,
    },
    include: {
      enrollments: {
        where: {
          group: {
            tenantId,
          },
        },
        orderBy: [
          { status: 'asc' },
          { group: { subject: 'asc' } },
          { group: { name: 'asc' } },
        ],
        include: {
          group: true,
        },
      },
      studentPayments: {
        where: {
          tenantId,
        },
        orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
      },
      attendanceRecords: {
        where: {
          tenantId,
          createdAt: {
            gte: getAttendanceWindowStart(),
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        include: {
          group: true,
          session: true,
        },
      },
    },
  })

  if (!student) {
    return null
  }

  const attendanceRate = await getAttendanceRateForStudent(tenantId, studentId)

  return {
    student,
    attendanceRate,
    paymentStatus: resolvePaymentStatus(
      student.studentPayments
        .filter((payment) => payment.month === getCurrentMonthKey())
        .map((payment) => payment.status),
    ),
    paymentHistory: student.studentPayments,
    enrolledGroups: mapEnrollmentsToGroups(student.enrollments).filter(
      (group) =>
        group.enrollmentStatus === EnrollmentStatus.ACTIVE ||
        group.enrollmentStatus === EnrollmentStatus.WAITLIST,
    ),
    recentAttendance: student.attendanceRecords,
  }
}

export async function searchStudents(tenantId: string, query: string) {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return []
  }

  const students = await db.user.findMany({
    where: {
      tenantId,
      role: UserRole.STUDENT,
      isActive: true,
      name: {
        contains: normalizedQuery,
        mode: 'insensitive',
      },
    },
    orderBy: [{ name: 'asc' }],
    take: 10,
    select: {
      id: true,
      name: true,
      phone: true,
      gradeLevel: true,
      parentPhone: true,
    },
  })

  if (students.length === 0) {
    return []
  }

  const paymentStatusMap = await getCurrentMonthPaymentStatusMap(
    tenantId,
    students.map((student) => student.id),
  )

  return students.map((student) => ({
    ...student,
    paymentStatus: resolvePaymentStatus(paymentStatusMap[student.id] ?? []),
  }))
}
