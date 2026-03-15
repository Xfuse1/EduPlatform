import { EnrollmentStatus, PaymentStatus, UserRole } from '@prisma/client'

import { db } from '@/lib/db'
import {
  getAttendanceRate,
  getRecentAttendance,
} from '@/modules/attendance/queries'
import {
  getCurrentMonthPaymentStatusMap,
  getStudentPaymentHistory,
  resolvePaymentStatus,
} from '@/modules/payments/queries'

const ACTIVE_ENROLLMENT_STATUSES = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.WAITLIST,
]

type GetStudentsFilters = {
  search?: string
  groupId?: string
  paymentStatus?: PaymentStatus
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
    },
  })

  if (!student) {
    return null
  }

  const [paymentHistory, recentAttendance, paymentStatusMap] = await Promise.all([
    getStudentPaymentHistory(tenantId, studentId),
    getRecentAttendance(tenantId, studentId, 20),
    getCurrentMonthPaymentStatusMap(tenantId, [studentId]),
  ])

  return {
    ...student,
    groups: mapEnrollmentsToGroups(student.enrollments),
    studentPayments: paymentHistory,
    attendanceRecords: recentAttendance,
    paymentStatus: resolvePaymentStatus(paymentStatusMap[student.id] ?? []),
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
    },
  })

  if (!student) {
    return null
  }

  const [attendanceRate, paymentHistory, recentAttendance, paymentStatusMap] =
    await Promise.all([
      getAttendanceRate(tenantId, studentId),
      getStudentPaymentHistory(tenantId, studentId),
      getRecentAttendance(tenantId, studentId, 10),
      getCurrentMonthPaymentStatusMap(tenantId, [studentId]),
    ])

  return {
    student,
    attendanceRate,
    paymentStatus: resolvePaymentStatus(paymentStatusMap[studentId] ?? []),
    paymentHistory,
    enrolledGroups: mapEnrollmentsToGroups(student.enrollments).filter(
      (group) =>
        group.enrollmentStatus === EnrollmentStatus.ACTIVE ||
        group.enrollmentStatus === EnrollmentStatus.WAITLIST,
    ),
    recentAttendance,
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
