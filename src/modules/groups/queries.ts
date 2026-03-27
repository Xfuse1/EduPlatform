import { EnrollmentStatus, UserRole } from '@prisma/client'

import { db } from '@/lib/db'
import { buildWeeklyScheduleItems } from '@/lib/schedule'
import {
  getCurrentMonthPaymentStatusMap,
  resolvePaymentStatus,
} from '@/modules/payments/queries'
import { getRecentGroupSessions } from '@/modules/schedule/queries'

const ACTIVE_GROUP_STATUSES = [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLIST]
const DAY_LABELS: Record<string, string> = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
}

function toArabicDay(day: string) {
  return DAY_LABELS[day] ?? day
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
    orderBy: [{ timeStart: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      subject: true,
      days: true,
      timeStart: true,
      timeEnd: true,
      room: true,
      color: true,
    },
  })

  return buildWeeklyScheduleItems(
    groups.map((group) => ({
      ...group,
      days: group.days.map(toArabicDay),
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
        },
      },
    },
  })

  return buildWeeklyScheduleItems(
    enrollments.map(({ group }) => ({
      ...group,
      days: group.days.map(toArabicDay),
    })),
  )
}
