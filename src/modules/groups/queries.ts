import { EnrollmentStatus, UserRole } from '@/generated/client'

import { db } from '@/lib/db'
import { buildWeeklyScheduleItems } from '@/lib/schedule'
import {
  getCurrentMonthPaymentStatusMap,
  resolvePaymentStatus,
} from '@/modules/payments/queries'
import { getRecentGroupSessions } from '@/modules/schedule/queries'
import { getArabicDayLabel, parseStoredGroupSchedule } from '@/modules/groups/schedule'

const ACTIVE_GROUP_STATUSES = [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLIST]

function toArabicDay(day: string) {
  return getArabicDayLabel(day)
}

export async function getGroups(tenantId: string, teacherId?: string) {
  const groups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(teacherId ? { teacherId } : {}),
    },
    orderBy: [
      { subject: 'asc' },
      { gradeLevel: 'asc' },
      { name: 'asc' },
    ],
    include: {
      groupStudents: {
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

  return groups.map(({ groupStudents, ...group }) => ({
    ...group,
    schedule: parseStoredGroupSchedule(group.schedule, {
      days: group.days,
      timeStart: group.timeStart,
      timeEnd: group.timeEnd,
    }),
    studentCount: groupStudents.length,
  }))
}

export async function getGroupStudents(tenantId: string, groupId: string, teacherId?: string) {
  const enrollments = await db.groupStudent.findMany({
    where: {
      groupId,
      status: {
        in: ACTIVE_GROUP_STATUSES,
      },
      group: {
        id: groupId,
        tenantId,
        ...(teacherId ? { teacherId } : {}),
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

export async function getGroupById(tenantId: string, groupId: string, teacherId?: string) {
  const group = await db.group.findFirst({
    where: {
      id: groupId,
      tenantId,
      ...(teacherId ? { teacherId } : {}),
    },
  })

  if (!group) {
    return null
  }

  const [students, recentSessions] = await Promise.all([
    getGroupStudents(tenantId, groupId, teacherId),
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
    schedule: parseStoredGroupSchedule(group.schedule, {
      days: group.days,
      timeStart: group.timeStart,
      timeEnd: group.timeEnd,
    }),
    activeStudentCount,
    waitlistCount,
    students,
    recentSessions,
  }
}

export async function getGroupsList(tenantId: string, teacherId?: string) {
  const groups = await getGroups(tenantId, teacherId)

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    subject: group.subject,
    gradeLevel: group.gradeLevel,
    days: group.days.map(toArabicDay),
    timeStart: group.timeStart,
    timeEnd: group.timeEnd,
    schedule: group.schedule,
    room: group.room,
    monthlyFee: group.monthlyFee,
    maxCapacity: group.maxCapacity,
    enrolledCount: group.studentCount,
    color: group.color,
  }))
}

export async function getTeacherScheduleItems(tenantId: string, teacherId?: string) {
  const groups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(teacherId ? { teacherId } : {}),
    },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      subject: true,
      days: true,
      timeStart: true,
      timeEnd: true,
      room: true,
      color: true,
      schedule: true,
    },
  })

  return buildWeeklyScheduleItems(
    groups.map((group) => ({
      ...group,
      schedule: parseStoredGroupSchedule(group.schedule, {
        days: group.days,
        timeStart: group.timeStart,
        timeEnd: group.timeEnd,
      }),
    })),
  )
}

export async function getStudentScheduleItems(tenantId: string, studentId: string) {
  const enrollments = await db.groupStudent.findMany({
    where: {
      studentId,
      status: EnrollmentStatus.ACTIVE,
      student: {
        tenantId,
        role: UserRole.STUDENT,
      },
      group: {
        tenantId,
        isActive: true,
      },
    },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          subject: true,
          days: true,
          timeStart: true,
          timeEnd: true,
          room: true,
          color: true,
          schedule: true,
        },
      },
    },
  })

  return buildWeeklyScheduleItems(
    enrollments.map(({ group }) => ({
      ...group,
      schedule: parseStoredGroupSchedule(group.schedule, {
        days: group.days,
        timeStart: group.timeStart,
        timeEnd: group.timeEnd,
      }),
    })),
  )
}
