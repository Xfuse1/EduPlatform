import {
  AttendanceStatus,
  EnrollmentStatus,
  UserRole,
} from '@/generated/client'

import type { DayOfWeek } from '@/types'
import { db } from '@/lib/db'
import {
  getMinutesFromTime as parseTimeToMinutes,
  isValidTimeValue,
  parseStoredGroupSchedule,
} from '@/modules/groups/schedule'

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

type ConflictType = 'teacher' | 'room' | 'teacher_and_room'

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
  // Compare by numeric minutes rather than lexicographic string ordering, which
  // is only correct for zero-padded 24h HH:MM. Non-HH:MM values (e.g. '9:00')
  // parse to null and are treated as non-overlapping.
  const aStart = parseTimeToMinutes(firstStart)
  const aEnd = parseTimeToMinutes(firstEnd)
  const bStart = parseTimeToMinutes(secondStart)
  const bEnd = parseTimeToMinutes(secondEnd)

  if (aStart === null || aEnd === null || bStart === null || bEnd === null) {
    return false
  }

  return aStart < bEnd && aEnd > bStart
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
  teacherId?: string | null,
) {
  const normalizedDays = days.filter(isDayOfWeek)

  if (normalizedDays.length === 0) {
    return []
  }

  // Validate the proposed window: must be HH:MM and start strictly before end.
  // Invalid input cannot meaningfully overlap anything, so report no conflicts.
  if (!isValidTimeValue(timeStart) || !isValidTimeValue(timeEnd)) {
    return []
  }
  const proposedStart = parseTimeToMinutes(timeStart)
  const proposedEnd = parseTimeToMinutes(timeEnd)
  if (proposedStart === null || proposedEnd === null || proposedStart >= proposedEnd) {
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

      // A genuine "teacher" conflict only exists when the overlapping group
      // belongs to the same teacher being scheduled. When no teacherId is
      // supplied, preserve the legacy behaviour and treat every overlap as a
      // teacher conflict.
      const sameTeacher =
        teacherId == null || (group.teacherId != null && group.teacherId === teacherId)

      const conflictType: ConflictType = sameTeacher
        ? sameRoom
          ? 'teacher_and_room'
          : 'teacher'
        : 'room'

      return {
        ...group,
        schedule: getGroupScheduleEntries(group),
        studentCount: groupStudents.length,
        conflictType,
        // Internal flag used to drop time overlaps that are not real conflicts
        // for the scheduling teacher (different teacher AND different room).
        _isConflict: sameTeacher || sameRoom,
      }
    })
    .filter((group) => group._isConflict)
    .map(({ _isConflict, ...group }) => group)
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
