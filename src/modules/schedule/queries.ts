import {
  AttendanceStatus,
  EnrollmentStatus,
  UserRole,
} from '@/generated/client'

import type { DayOfWeek } from '@/types'
import { db } from '@/lib/db'
import { parseStoredGroupSchedule } from '@/modules/groups/schedule'

const DAY_ORDER: DayOfWeek[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
]
const ATTENDED_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
]

type ConflictType = 'teacher' | 'teacher_and_room'

function isDayOfWeek(value: string): value is DayOfWeek {
  return DAY_ORDER.includes(value as DayOfWeek)
}

function getMinutesFromTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function normalizeRoom(room?: string | null) {
  return room?.trim().toLowerCase() || null
}

function doTimesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  return firstStart < secondEnd && firstEnd > secondStart
}

function getGroupScheduleEntries(group: {
  schedule: unknown
  days: string[]
  timeStart: string
  timeEnd: string
}) {
  return parseStoredGroupSchedule(group.schedule, {
    days: group.days,
    timeStart: group.timeStart,
    timeEnd: group.timeEnd,
  }).filter((entry) => isDayOfWeek(entry.day))
}

export async function checkConflicts(
  tenantId: string,
  days: string[],
  timeStart: string,
  timeEnd: string,
  room?: string | null,
) {
  const normalizedDays = days.filter(isDayOfWeek)

  if (normalizedDays.length === 0) {
    return []
  }

  const groups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
    },
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
    orderBy: [{ name: 'asc' }],
  })

  const normalizedRoom = normalizeRoom(room)

  return groups
    .filter((group) =>
      getGroupScheduleEntries(group).some(
        (entry) =>
          normalizedDays.includes(entry.day) &&
          doTimesOverlap(entry.timeStart, entry.timeEnd, timeStart, timeEnd),
      ),
    )
    .map(({ groupStudents, ...group }) => {
      const sameRoom =
        normalizedRoom !== null &&
        normalizeRoom(group.room) !== null &&
        normalizeRoom(group.room) === normalizedRoom

      return {
        ...group,
        schedule: getGroupScheduleEntries(group),
        studentCount: groupStudents.length,
        conflictType: sameRoom ? 'teacher_and_room' : ('teacher' as ConflictType),
      }
    })
}

export async function getWeeklySchedule(tenantId: string) {
  const groups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: [{ name: 'asc' }],
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

  type ScheduleEntry = {
    id: string
    groupId: string
    groupName: string
    subject: string
    gradeLevel: string
    day: DayOfWeek
    timeStart: string
    timeEnd: string
    room: string | null
    color: string
    studentCount: number
    maxCapacity: number
    hasConflict: boolean
    conflictGroupIds: string[]
  }

  const entries: ScheduleEntry[] = groups.flatMap(({ groupStudents, ...group }) =>
    getGroupScheduleEntries(group).map((entry, index) => ({
      id: `${group.id}-${entry.day}-${index}`,
      groupId: group.id,
      groupName: group.name,
      subject: group.subject,
      gradeLevel: group.gradeLevel,
      day: entry.day,
      timeStart: entry.timeStart,
      timeEnd: entry.timeEnd,
      room: group.room,
      color: group.color,
      studentCount: groupStudents.length,
      maxCapacity: group.maxCapacity,
      hasConflict: false,
      conflictGroupIds: [],
    })),
  )

  const entriesByDay = Object.fromEntries(
    DAY_ORDER.map((day) => [day, [] as ScheduleEntry[]]),
  ) as Record<DayOfWeek, ScheduleEntry[]>

  for (const day of DAY_ORDER) {
    const dayEntries = entries
      .filter((entry) => entry.day === day)
      .sort((firstEntry, secondEntry) =>
        firstEntry.timeStart.localeCompare(secondEntry.timeStart),
      )

    for (let index = 0; index < dayEntries.length; index += 1) {
      for (
        let compareIndex = index + 1;
        compareIndex < dayEntries.length;
        compareIndex += 1
      ) {
        const currentEntry = dayEntries[index]
        const comparedEntry = dayEntries[compareIndex]

        if (
          doTimesOverlap(
            currentEntry.timeStart,
            currentEntry.timeEnd,
            comparedEntry.timeStart,
            comparedEntry.timeEnd,
          )
        ) {
          currentEntry.hasConflict = true
          comparedEntry.hasConflict = true
          currentEntry.conflictGroupIds.push(comparedEntry.groupId)
          comparedEntry.conflictGroupIds.push(currentEntry.groupId)
        }
      }

      dayEntries[index].conflictGroupIds = [...new Set(dayEntries[index].conflictGroupIds)]
    }

    entriesByDay[day] = dayEntries
  }

  const timeSlots =
    entries.length === 0
      ? []
      : [...new Set(entries.flatMap((entry) => [entry.timeStart, entry.timeEnd]))].sort(
          (firstTime, secondTime) =>
            getMinutesFromTime(firstTime) - getMinutesFromTime(secondTime),
        )

  return {
    days: entriesByDay,
    timeSlots,
  }
}

export async function getRecentGroupSessions(
  tenantId: string,
  groupId: string,
  take = 6,
) {
  const sessions = await db.session.findMany({
    where: {
      tenantId,
      groupId,
    },
    orderBy: [{ date: 'desc' }, { timeStart: 'desc' }],
    take,
    include: {
      attendances: {
        select: {
          status: true,
        },
      },
    },
  })

  return sessions.map(({ attendances, ...session }) => ({
    ...session,
    attendanceCount: attendances.length,
    attendedCount: attendances.filter((record) =>
      ATTENDED_STATUSES.includes(record.status),
    ).length,
  }))
}
