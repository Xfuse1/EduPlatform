import { cache } from "react";

import { db } from "@/lib/db";
import { MOCK_ATTENDANCE_OVERVIEW, MOCK_ATTENDANCE_SESSIONS, MOCK_STUDENT_ATTENDANCE, MOCK_TODAY_SESSIONS } from "@/lib/mock-data";

const arabicWeekDays = new Set(["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]);

function getTodayInfo() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayName = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(now);

  return {
    date,
    dayName: arabicWeekDays.has(dayName) ? dayName : "السبت",
  };
}

export const getTodaySessions = cache(async (tenantId: string) => {
  try {
    const today = getTodayInfo();
    const groups = await db.group.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        students: {
          where: {
            status: "ACTIVE",
          },
          select: {
            studentId: true,
          },
        },
      },
      orderBy: {
        timeStart: "asc",
      },
    });

    const matchingGroups = groups.filter((group) => group.days.includes(today.dayName));

    const sessions = await Promise.all(
      matchingGroups.map(async (group) => {
        const session = await db.session.upsert({
          where: {
            groupId_date: {
              groupId: group.id,
              date: today.date,
            },
          },
          update: {},
          create: {
            tenantId,
            groupId: group.id,
            date: today.date,
            timeStart: group.timeStart,
            timeEnd: group.timeEnd,
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            attendance: {
              select: {
                id: true,
              },
            },
          },
        });

        return {
          id: session.id,
          timeStart: session.timeStart,
          timeEnd: session.timeEnd,
          status: session.status,
          group: session.group,
          attendanceCount: session.attendance.length,
          totalStudents: group.students.length,
        };
      }),
    );

    return sessions;
  } catch (error) {
    console.error("DB getTodaySessions failed, using mock:", error);
  }

  return MOCK_TODAY_SESSIONS.map((session) => ({
    ...session,
    attendanceCount: 0,
    totalStudents: 0,
  }));
});

export const getAttendanceOverview = cache(async (tenantId: string) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [recentRecords, previousRecords] = await Promise.all([
      db.attendance.findMany({
        where: {
          tenantId,
          markedAt: {
            gte: last30Days,
          },
        },
        select: {
          status: true,
        },
      }),
      db.attendance.findMany({
        where: {
          tenantId,
          markedAt: {
            gte: previous30Days,
            lt: last30Days,
          },
        },
        select: {
          status: true,
        },
      }),
    ]);

    const recentPresent = recentRecords.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
    const previousPresent = previousRecords.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
    const recentRate = recentRecords.length ? Math.round((recentPresent / recentRecords.length) * 100) : 0;
    const previousRate = previousRecords.length ? Math.round((previousPresent / previousRecords.length) * 100) : 0;

    return {
      rate: recentRate,
      change: recentRate - previousRate,
    };
  } catch (error) {
    console.error("DB getAttendanceOverview failed, using mock:", error);
  }

  return MOCK_ATTENDANCE_OVERVIEW;
});

export const getStudentAttendanceSnapshot = cache(async (tenantId: string, studentId: string) => {
  try {
    const records = await db.attendance.findMany({
      where: {
        tenantId,
        studentId,
      },
      orderBy: {
        markedAt: "desc",
      },
      take: 10,
      include: {
        session: {
          select: {
            date: true,
          },
        },
      },
    });

    const attendedCount = records.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
    const rate = records.length ? Math.round((attendedCount / records.length) * 100) : 0;

    return {
      rate,
      records,
    };
  } catch (error) {
    console.error("DB getStudentAttendanceSnapshot failed, using mock:", error);
  }

  return {
    ...MOCK_STUDENT_ATTENDANCE,
    records: [],
  };
});

export const getAttendanceSessionsList = cache(async (tenantId: string) => {
  try {
    const sessions = await getTodaySessions(tenantId);

    return sessions.map((session) => {
      const remaining = session.status === "IN_PROGRESS" ? "الحصة جارية الآن" : session.status === "SCHEDULED" ? "لم تبدأ بعد" : "اكتملت الحصة";

      return {
        id: session.id,
        title: session.group.name,
        group: session.group.name,
        status: session.status,
        timeStart: session.timeStart,
        timeEnd: session.timeEnd,
        attended: session.attendanceCount ?? 0,
        total: session.totalStudents ?? 0,
        remaining,
      };
    });
  } catch (error) {
    console.error("DB getAttendanceSessionsList failed, using mock:", error);
  }

  return MOCK_ATTENDANCE_SESSIONS;
});
export const getSessionWithStudents = cache(async (sessionId: string) => {
  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        group: {
          include: {
            students: {
              where: { status: "ACTIVE" },
              include: {
                student: {
                  select: { id: true, name: true, phone: true },
                },
              },
            },
          },
        },
        attendance: true,
      },
    });

    if (!session) return null;

    const students = session.group.students.map((gs) => {
      const record = session.attendance.find((a) => a.studentId === gs.studentId);

      return {
        id: gs.student.id,
        name: gs.student.name,
        phone: gs.student.phone,
        status: record ? record.status : "ABSENT",
        method: record ? record.method : "MANUAL",
        markedAt: record ? record.markedAt : null,
      };
    });

    return {
      id: session.id,
      groupId: session.groupId,
      tenantId: session.tenantId,
      title: session.group.name,
      status: session.status,
      timeStart: session.timeStart,
      timeEnd: session.timeEnd,
      qrToken: session.qrToken,
      qrExpiresAt: session.qrExpiresAt,
      students: students.sort((a, b) => a.name.localeCompare(b.name, "ar")),
    };
  } catch (error) {
    console.error("DB getSessionWithStudents failed:", error);
    return null;
  }
});
export const getAllAttendanceRecords = cache(async (tenantId: string) => {
  try {
    const records = await db.attendance.findMany({
      where: { tenantId },
      include: {
        student: { select: { name: true } },
        session: { select: { date: true, group: { select: { name: true } } } },
      },
      orderBy: { markedAt: "desc" },
    });

    return records.map((r) => ({
      id: r.id,
      studentName: r.student.name,
      groupName: r.session.group.name,
      date: r.session.date,
      status: r.status,
      method: r.method,
      markedAt: r.markedAt,
    }));
  } catch (error) {
    console.error("DB getAllAttendanceRecords failed:", error);
    return [];
  }
});
