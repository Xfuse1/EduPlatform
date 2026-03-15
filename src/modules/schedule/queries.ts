import { EnrollmentStatus, UserRole } from '@prisma/client'

import type { DayOfWeek } from '@/types'
import { db } from '@/lib/db'

const DAY_ORDER: DayOfWeek[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
]

type ConflictType = 'teacher' | 'teacher_and_room'

function isDayOfWeek(value: string): value is DayOfWeek {
  return DAY_ORDER.includes(value as DayOfWeek)
}

function getMinutesFromTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTimeFromMinutes(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  return `${hours}:${minutes}`
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

  const overlappingGroups = await db.group.findMany({
    where: {
      tenantId,
      isActive: true,
      days: {
        hasSome: normalizedDays,
      },
      AND: [
        {
          timeStart: {
            lt: timeEnd,
          },
        },
        {
          timeEnd: {
            gt: timeStart,
          },
        },
      ],
    },
    orderBy: [{ timeStart: 'asc' }, { name: 'asc' }],
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

  const normalizedRoom = normalizeRoom(room)

  return overlappingGroups.map(({ students, ...group }) => {
    const sameRoom =
      normalizedRoom !== null &&
      normalizeRoom(group.room) !== null &&
      normalizeRoom(group.room) === normalizedRoom

    return {
      ...group,
      studentCount: students.length,
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
    orderBy: [{ timeStart: 'asc' }, { subject: 'asc' }, { name: 'asc' }],
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

  const entries: ScheduleEntry[] = groups.flatMap(({ students, ...group }) =>
    group.days.filter(isDayOfWeek).map((day) => ({
      id: `${group.id}-${day}`,
      groupId: group.id,
      groupName: group.name,
      subject: group.subject,
      gradeLevel: group.gradeLevel,
      day,
      timeStart: group.timeStart,
      timeEnd: group.timeEnd,
      room: group.room,
      color: group.color,
      studentCount: students.length,
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
