import { cache } from "react";

import { db } from "@/lib/db";
import { parseStoredGroupSchedule } from "@/modules/groups/schedule";

const dayValueByIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function getTodayInfo() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  return {
    date,
    dayName: dayValueByIndex[now.getDay()],
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
        groupStudents: {
          where: {
            status: "ACTIVE",
          },
          select: {
            studentId: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const matchingGroups = groups
      .map((group) => {
        const scheduleEntry = parseStoredGroupSchedule(group.schedule, {
          days: group.days,
          timeStart: group.timeStart,
          timeEnd: group.timeEnd,
        }).find((entry) => entry.day === today.dayName);

        if (!scheduleEntry) {
          return null;
        }

        return {
          group,
          scheduleEntry,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const sessions = await Promise.all(
      matchingGroups.map(async ({ group, scheduleEntry }) => {
        const session = await db.session.upsert({
          where: {
            groupId_date: {
              groupId: group.id,
              date: today.date,
            },
          },
          update: {
            timeStart: scheduleEntry.timeStart,
            timeEnd: scheduleEntry.timeEnd,
          },
          create: {
            tenantId,
            groupId: group.id,
            date: today.date,
            timeStart: scheduleEntry.timeStart,
            timeEnd: scheduleEntry.timeEnd,
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            attendances: {
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
          attendanceCount: session.attendances.length,
          totalStudents: group.groupStudents.length,
        };
      }),
    );

    return sessions;
  } catch (error) {
    console.error("DB getTodaySessions failed, using mock:", error);
  }

  return [];
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

  return { rate: 0, change: 0 };
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
        session: { select: { date: true } },
        group: { select: { name: true } },
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

  return { rate: 0, records: [] };
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

  return [];
});
export const getSessionWithStudents = cache(async (sessionId: string) => {
  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        group: {
          include: {
            groupStudents: {
              where: { status: "ACTIVE" },
              select: {
                studentId: true,
                enrolledAt: true,
                student: {
                  select: { id: true, name: true, phone: true },
                },
              },
            },
          },
        },
        attendances: true,
      },
    });

    if (!session) return null;

    // Get all student IDs involved (either in group or in attendance)
    const groupStudentIds = new Set(session.group.groupStudents.map((gs) => gs.studentId));
    const attendanceStudentIds = new Set(session.attendances.map((a) => a.studentId));
    const allStudentIds = new Set([...groupStudentIds, ...attendanceStudentIds]);

    // Fetch details for students who are not in the group but are in attendance (guests)
    const guestIds = [...attendanceStudentIds].filter(id => !groupStudentIds.has(id));
    const guestStudents = guestIds.length > 0 
      ? await db.user.findMany({
          where: { id: { in: guestIds } },
          select: { id: true, name: true, phone: true }
        })
      : [];

    // Map all students
    const students = [...allStudentIds].map((id) => {
      const gs = session.group.groupStudents.find((s) => s.studentId === id);
      const record = session.attendances.find((a) => a.studentId === id);
      const guestInfo = guestStudents.find((s) => s.id === id);

      return {
        id: id,
        name: gs ? gs.student.name : (guestInfo ? guestInfo.name : "طالب غير معروف"),
        phone: gs ? gs.student.phone : (guestInfo ? guestInfo.phone : ""),
        status: record ? record.status : (gs && gs.enrolledAt > session.date ? "NOT_ENROLLED" : "ABSENT"),
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

export const getAttendanceReport = cache(async (tenantId: string, month: string, _teacherId?: string) => {
  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const sessions = await db.session.findMany({
    where: {
      tenantId,
      date: {
        gte: monthStart,
        lt: monthEnd,
      },
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
          attendances: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  return sessions.map((session) => ({
    ...session,
    _count: {
      attendance: session._count.attendances,
    },
  }));
});

export const getSessionAttendance = cache(async (tenantId: string, sessionId: string, _teacherId?: string) => {
  const session = await getSessionWithStudents(sessionId);

  if (!session || session.tenantId !== tenantId) {
    return null;
  }

  const { getCurrentMonthPaymentStatusMap, resolvePaymentStatus } = await import("@/modules/payments/queries");
  const paymentStatuses = await getCurrentMonthPaymentStatusMap(tenantId, session.students.map((student) => student.id));

  return {
    session: {
      id: session.id,
      status: session.status,
      date: new Date(),
      group: {
        id: session.groupId,
        name: session.title,
        timeStart: session.timeStart,
        timeEnd: session.timeEnd,
      },
    },
    students: session.students.map((student) => ({
      id: student.id,
      name: student.name,
      phone: student.phone,
      attendanceStatus: student.status,
      paymentStatus: resolvePaymentStatus(paymentStatuses[student.id] ?? []),
    })),
  };
});

