import { EnrollmentStatus, UserRole } from '@prisma/client'

import { db } from '@/lib/db'
import {
  getCurrentMonthPaymentStatusMap,
  resolvePaymentStatus,
} from '@/modules/payments/queries'
import { getRecentGroupSessions } from '@/modules/schedule/queries'

const ACTIVE_GROUP_STATUSES = [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLIST]

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

  const paymentStatuses = await getCurrentMonthPaymentStatusMap(
    tenantId,
    enrollments.map((enrollment) => enrollment.studentId),
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

  const [students, recentSessions] = await Promise.all([
    getGroupStudents(tenantId, groupId),
    getRecentGroupSessions(tenantId, groupId),
  ])
  const activeStudentCount = students.filter(
    (student) => student.status === EnrollmentStatus.ACTIVE,
  ).length
  const waitlistCount = students.filter(
    (student) => student.status === EnrollmentStatus.WAITLIST,
  ).length

  return {
    ...group,
    activeStudentCount,
    waitlistCount,
    students,
    recentSessions,
  }
}
