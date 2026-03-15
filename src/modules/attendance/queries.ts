import { AttendanceStatus } from '@prisma/client'

import { db } from '@/lib/db'

const ATTENDED_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
]

export function getAttendanceWindowStart(date = new Date()) {
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - 30)
  startDate.setHours(0, 0, 0, 0)
  return startDate
}

export async function getAttendanceRateMap(
  tenantId: string,
  studentIds: string[],
  startDate = getAttendanceWindowStart(),
) {
  if (studentIds.length === 0) {
    return {}
  }

  const attendanceRecords = await db.attendance.findMany({
    where: {
      tenantId,
      studentId: {
        in: studentIds,
      },
      session: {
        date: {
          gte: startDate,
        },
      },
    },
    select: {
      studentId: true,
      status: true,
    },
  })

  const counters = attendanceRecords.reduce<
    Record<string, { total: number; attended: number }>
  >((accumulator, record) => {
    accumulator[record.studentId] ??= { total: 0, attended: 0 }
    accumulator[record.studentId].total += 1

    if (ATTENDED_STATUSES.includes(record.status)) {
      accumulator[record.studentId].attended += 1
    }

    return accumulator
  }, {})

  return Object.fromEntries(
    studentIds.map((studentId) => {
      const counter = counters[studentId]

      if (!counter || counter.total === 0) {
        return [studentId, 0]
      }

      return [
        studentId,
        Math.round((counter.attended / counter.total) * 100),
      ]
    }),
  ) as Record<string, number>
}

export async function getAttendanceRate(
  tenantId: string,
  studentId: string,
  startDate = getAttendanceWindowStart(),
) {
  const rateMap = await getAttendanceRateMap(tenantId, [studentId], startDate)
  return rateMap[studentId] ?? 0
}

export async function getRecentAttendance(
  tenantId: string,
  studentId: string,
  limit = 10,
) {
  return db.attendance.findMany({
    where: {
      tenantId,
      studentId,
    },
    orderBy: [{ session: { date: 'desc' } }, { markedAt: 'desc' }],
    take: limit,
    include: {
      group: {
        select: {
          name: true,
        },
      },
      session: {
        select: {
          date: true,
        },
      },
    },
  })
}
