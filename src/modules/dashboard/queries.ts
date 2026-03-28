import { cache } from "react";

import { db } from "@/lib/db";
import { MOCK_PARENT_NEXT_SESSION, MOCK_STUDENT_NEXT_SESSION, MOCK_TENANT } from "@/lib/mock-data";
import { getAssignmentsByParent } from "@/modules/assignments/queries";
import { getAttendanceOverview, getStudentAttendanceSnapshot, getTodaySessions } from "@/modules/attendance/queries";
import { getRevenueSummary, getStudentPaymentSnapshot } from "@/modules/payments/queries";
import { getParentChildren, getStudentCountSummary, getStudentProfile } from "@/modules/students/queries";

const arabicDaysByIndex = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;

function getNextDateForDay(dayName: string, fromDate: Date) {
  const targetDayIndex = arabicDaysByIndex.indexOf(dayName as (typeof arabicDaysByIndex)[number]);

  if (targetDayIndex === -1) {
    return null;
  }

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(fromDate);
    candidate.setDate(fromDate.getDate() + offset);

    if (candidate.getDay() === targetDayIndex) {
      candidate.setHours(0, 0, 0, 0);
      return candidate;
    }
  }

  return null;
}

function getNextSessionFromEnrollments(
  enrollments: Array<{
    group: {
      name: string;
      days: string[];
      timeStart: string;
      timeEnd?: string;
    };
  }>,
) {
  const now = new Date();

  const upcoming = enrollments
    .flatMap((enrollment) =>
      enrollment.group.days.map((day) => {
        const date = getNextDateForDay(day, now);

        if (!date) {
          return null;
        }

        return {
          date,
          timeStart: enrollment.group.timeStart,
          timeEnd: enrollment.group.timeEnd ?? enrollment.group.timeStart,
          group: {
            name: enrollment.group.name,
          },
        };
      }),
    )
    .filter((item): item is { date: Date; timeStart: string; timeEnd: string; group: { name: string } } => item !== null)
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  return upcoming[0] ?? null;
}

export const getTeacherDashboardData = cache(async (tenantId: string) => {
  try {
    const [revenue, todaySessions, students, attendance, tenant, overduePayments, repeatedAbsences] = await Promise.all([
      getRevenueSummary(tenantId),
      getTodaySessions(tenantId),
      getStudentCountSummary(tenantId),
      getAttendanceOverview(tenantId),
      db.tenant.findFirst({
        where: {
          id: tenantId,
          isActive: true,
        },
        select: {
          name: true,
        },
      }),
      db.payment.findMany({
        where: {
          tenantId,
          status: "OVERDUE",
        },
        include: {
          student: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.attendance.groupBy({
        by: ["studentId"],
        where: {
          tenantId,
          status: "ABSENT",
        },
        _count: {
          studentId: true,
        },
        having: {
          studentId: {
            _count: {
              gte: 3,
            },
          },
        },
      }),
    ]);

    const absenceStudents =
      repeatedAbsences.length > 0
        ? await db.user.findMany({
            where: {
              tenantId,
              id: {
                in: repeatedAbsences.map((item) => item.studentId),
              },
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [];

    const paymentAlerts = overduePayments.map((payment) => ({
      id: payment.id,
      studentName: payment.student.name,
      message: `مبلغ متأخر على ${payment.student.name}`,
      amount: payment.amount,
      severity: "high" as const,
    }));

    const absenceAlerts = repeatedAbsences.map((absence) => {
      const student = absenceStudents.find((item) => item.id === absence.studentId);
      const studentName = student?.name ?? "طالب";

      return {
        id: `absence-${absence.studentId}`,
        studentName,
        message: `غياب متكرر للطالب ${studentName}`,
        amount: 0,
        severity: "high" as const,
      };
    });

    return {
      teacherName: tenant?.name ?? MOCK_TENANT.name,
      revenue: {
        thisMonth: revenue.thisMonth,
        lastMonth: revenue.lastMonth,
        change: revenue.change,
      },
      outstanding: {
        total: revenue.outstanding,
        count: overduePayments.length,
      },
      students,
      attendance,
      todaySessions,
      alerts: [...paymentAlerts, ...absenceAlerts],
    };
  } catch (error) {
    console.error("DB getTeacherDashboardData failed, using fallback:", error);
  }

  const [revenue, todaySessions, students, attendance] = await Promise.all([
    getRevenueSummary(tenantId),
    getTodaySessions(tenantId),
    getStudentCountSummary(tenantId),
    getAttendanceOverview(tenantId),
  ]);

  return {
    teacherName: MOCK_TENANT.name,
    revenue: {
      thisMonth: revenue.thisMonth,
      lastMonth: revenue.lastMonth,
      change: revenue.change,
    },
    outstanding: {
      total: revenue.outstanding,
      count: 0,
    },
    students,
    attendance,
    todaySessions,
    alerts: [],
  };
});

export const getStudentDashboardData = cache(async (tenantId: string, studentId: string) => {
  try {
    const [profile, attendance, payment] = await Promise.all([
      getStudentProfile(tenantId, studentId),
      getStudentAttendanceSnapshot(tenantId, studentId),
      getStudentPaymentSnapshot(tenantId, studentId),
    ]);

    return {
      profile,
      attendance,
      payment,
      nextSession: getNextSessionFromEnrollments(profile?.enrollments ?? []) ?? MOCK_STUDENT_NEXT_SESSION,
    };
  } catch (error) {
    console.error("DB getStudentDashboardData failed, using fallback:", error);
  }

  const [profile, attendance, payment] = await Promise.all([
    getStudentProfile(tenantId, studentId),
    getStudentAttendanceSnapshot(tenantId, studentId),
    getStudentPaymentSnapshot(tenantId, studentId),
  ]);

  return { profile, attendance, payment, nextSession: MOCK_STUDENT_NEXT_SESSION };
});

export const getParentDashboardData = cache(async (tenantId: string, parentId: string) => {
  try {
    const [children, notifications, parentAssignments] = await Promise.all([
      getParentChildren(tenantId, parentId),
      db.notification.findMany({
        where: { tenantId, userId: parentId, status: "QUEUED" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      getAssignmentsByParent(tenantId, parentId),
    ]);

    const childrenData = await Promise.all(
      children.map(async ({ student }) => {
        const [attendance, payment] = await Promise.all([
          getStudentAttendanceSnapshot(tenantId, student.id),
          getStudentPaymentSnapshot(tenantId, student.id),
        ]);

        return {
          id: student.id,
          name: student.name,
          grade: student.gradeLevel ?? "غير محدد",
          attendanceRate: attendance.rate,
          payment,
          todayStatus: attendance.records?.[0]?.status ?? "NO_SESSION",
          nextSession: getNextSessionFromEnrollments(
            student.enrollments.map((enrollment) => ({
              group: {
                name: enrollment.group.name,
                days: enrollment.group.days,
                timeStart: enrollment.group.timeStart,
                timeEnd: enrollment.group.timeEnd,
              },
            })),
          ),
        };
      }),
    );

    return { 
      children: childrenData,
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        message: n.message,
        createdAt: n.createdAt,
      })),
      assignments: parentAssignments
    };
  } catch (error) {
    console.error("DB getParentDashboardData failed, using fallback:", error);
  }

  return {
    children: [
      {
        id: "student-1",
        name: "محمد أحمد",
        grade: "غير محدد",
        attendanceRate: 0,
        payment: {
          status: "PENDING" as const,
          amount: 0,
        },
        todayStatus: "NO_SESSION",
        nextSession: MOCK_PARENT_NEXT_SESSION,
      },
    ],
    assignments: [],
  };
});
