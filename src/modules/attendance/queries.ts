import { cache } from "react";

import { db } from "@/lib/db";
import { formatArabicDate, getSessionStatusLabel } from "@/lib/utils";
import { formatDisplayTime } from "@/lib/schedule";
import { getCurrentMonthPaymentStatusMap, resolvePaymentStatus } from "@/modules/payments/queries";

function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addMonths(date: Date, offset: number) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + offset);
  return value;
}

function getAttendanceRate(statuses: string[]) {
  if (statuses.length === 0) {
    return 0;
  }

  const attendedCount = statuses.filter((status) => status !== "ABSENT").length;
  return Math.round((attendedCount / statuses.length) * 100);
}

function getSessionMeta(status: string, date: Date) {
  if (status === "IN_PROGRESS") {
    return "الحصة جارية الآن";
  }

  if (status === "SCHEDULED") {
    return formatArabicDate(date);
  }

  if (status === "COMPLETED") {
    return "اكتملت الحصة";
  }

  return getSessionStatusLabel(status);
}

export const getTodaySessions = cache(async (tenantId: string, teacherId?: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const sessions = await db.session.findMany({
    where: {
      tenantId,
      ...(teacherId
        ? {
            group: {
              teacherId,
            },
          }
        : {}),
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: {
      timeStart: "asc",
    },
    select: {
      id: true,
      timeStart: true,
      timeEnd: true,
      status: true,
      group: {
        select: {
          name: true,
        },
      },
    },
  });

  return sessions.map((session) => ({
    ...session,
    timeStart: formatDisplayTime(session.timeStart),
    timeEnd: formatDisplayTime(session.timeEnd),
  }));
});

export const getAttendanceOverview = cache(async (tenantId: string, teacherId?: string) => {
  const currentMonthStart = startOfMonth();
  const previousMonthStart = addMonths(currentMonthStart, -1);

  const records = await db.attendance.findMany({
    where: {
      tenantId,
      ...(teacherId
        ? {
            group: {
              teacherId,
            },
          }
        : {}),
      createdAt: {
        gte: previousMonthStart,
      },
    },
    select: {
      status: true,
      createdAt: true,
    },
  });

  const currentStatuses = records.filter((record) => record.createdAt >= currentMonthStart).map((record) => record.status);
  const previousStatuses = records.filter((record) => record.createdAt < currentMonthStart).map((record) => record.status);
  const rate = getAttendanceRate(currentStatuses);
  const previousRate = getAttendanceRate(previousStatuses);

  return {
    rate,
    change: rate - previousRate,
  };
});

export const getStudentAttendanceSnapshot = cache(async (tenantId: string, studentId: string) => {
  const currentMonthStart = startOfMonth();

  const records = await db.attendance.findMany({
    where: {
      tenantId,
      studentId,
      createdAt: {
        gte: currentMonthStart,
      },
    },
    select: {
      status: true,
    },
  });

  return {
    rate: getAttendanceRate(records.map((record) => record.status)),
  };
});

export const getAttendanceSessions = cache(async (tenantId: string, teacherId?: string) => {
  const sessions = await db.session.findMany({
    where: {
      tenantId,
      ...(teacherId
        ? {
            group: {
              teacherId,
            },
          }
        : {}),
    },
    orderBy: [{ date: "desc" }, { timeStart: "desc" }],
    take: 8,
    select: {
      id: true,
      date: true,
      timeStart: true,
      timeEnd: true,
      status: true,
      group: {
        select: {
          name: true,
          students: {
            where: {
              status: "ACTIVE",
            },
            select: {
              id: true,
            },
          },
        },
      },
      attendance: {
        select: {
          status: true,
        },
      },
    },
  });

  return sessions.map((session) => {
    const attended = session.attendance.filter((record) => record.status !== "ABSENT").length;
    const total = session.attendance.length || session.group.students.length;

    return {
      id: session.id,
      title: session.group.name,
      group: session.group.name,
      status: session.status,
      timeStart: formatDisplayTime(session.timeStart),
      timeEnd: formatDisplayTime(session.timeEnd),
      attended,
      total,
      remaining: getSessionMeta(session.status, session.date),
    };
  });
});

export const getAttendanceSeries = cache(async (tenantId: string, teacherId?: string) => {
  const currentMonthStart = startOfMonth();
  const formatter = new Intl.DateTimeFormat("ar-EG", { month: "long" });

  const records = await db.attendance.findMany({
    where: {
      tenantId,
      ...(teacherId
        ? {
            group: {
              teacherId,
            },
          }
        : {}),
    },
    select: {
      status: true,
      createdAt: true,
    },
  });

  return Array.from({ length: 6 }, (_, index) => {
    const monthStart = addMonths(currentMonthStart, index - 5);
    const nextMonth = addMonths(monthStart, 1);
    const monthStatuses = records
      .filter((record) => record.createdAt >= monthStart && record.createdAt < nextMonth)
      .map((record) => record.status);

    return {
      month: formatter.format(monthStart),
      rate: getAttendanceRate(monthStatuses),
    };
  });
});

export const getStudentTodayStatus = cache(async (tenantId: string, studentId: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const record = await db.attendance.findFirst({
    where: {
      tenantId,
      studentId,
      session: {
        date: {
          gte: start,
          lt: end,
        },
      },
    },
    orderBy: {
      markedAt: "desc",
    },
    select: {
      status: true,
    },
  });

  if (!record) {
    return "NONE" as const;
  }

  return record.status === "ABSENT" ? ("ABSENT" as const) : ("PRESENT" as const);
});

export const getAttendanceReport = cache(async (tenantId: string, month: string, teacherId?: string) => {
  const monthMatch = month.match(/^(\d{4})-(\d{2})$/);
  const start = monthMatch ? new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1) : startOfMonth();
  const end = addMonths(start, 1);

  return db.session.findMany({
    where: {
      tenantId,
      ...(teacherId
        ? {
            group: {
              teacherId,
            },
          }
        : {}),
      status: "COMPLETED",
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: {
      date: "desc",
    },
    select: {
      id: true,
      date: true,
      group: {
        select: {
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          attendance: true,
        },
      },
    },
  });
});

export const getSessionAttendance = cache(async (tenantId: string, sessionId: string, teacherId?: string) => {
  const session = await db.session.findFirst({
    where: {
      id: sessionId,
      tenantId,
      ...(teacherId
        ? {
            group: {
              teacherId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      groupId: true,
      date: true,
      group: {
        select: {
          name: true,
          timeStart: true,
          timeEnd: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const [enrollments, attendanceRecords] = await Promise.all([
    db.groupStudent.findMany({
      where: {
        groupId: session.groupId,
        status: {
          in: ["ACTIVE", "WAITLIST"],
        },
        student: {
          tenantId,
          role: "STUDENT",
          isActive: true,
        },
      },
      orderBy: {
        student: {
          name: "asc",
        },
      },
      select: {
        studentId: true,
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.attendance.findMany({
      where: {
        tenantId,
        sessionId,
      },
      select: {
        studentId: true,
        status: true,
      },
    }),
  ]);

  const paymentStatusMap = await getCurrentMonthPaymentStatusMap(
    tenantId,
    enrollments.map((enrollment) => enrollment.studentId),
  );
  const attendanceByStudentId = new Map(attendanceRecords.map((record) => [record.studentId, record.status]));

  return {
    session: {
      id: session.id,
      date: session.date,
      group: {
        name: session.group.name,
        timeStart: formatDisplayTime(session.group.timeStart),
        timeEnd: formatDisplayTime(session.group.timeEnd),
      },
    },
    students: enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: enrollment.student.name,
      attendanceStatus: attendanceByStudentId.get(enrollment.studentId) ?? "ABSENT",
      paymentStatus: resolvePaymentStatus(paymentStatusMap[enrollment.studentId] ?? []),
    })),
  };
});
