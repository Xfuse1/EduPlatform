import { cache } from "react";

import { db } from "@/lib/db";
import { getAttendanceOverview, getStudentAttendanceSnapshot, getTodaySessions } from "@/modules/attendance/queries";
import { getRevenueSummary, getStudentPaymentSnapshot } from "@/modules/payments/queries";
import { getParentChildren, getStudentCountSummary, getStudentProfile } from "@/modules/students/queries";

export const getTeacherDashboardData = cache(async (tenantId: string) => {
  const [revenue, todaySessions, students, attendance, overdueStudents] = await Promise.all([
    getRevenueSummary(tenantId),
    getTodaySessions(tenantId),
    getStudentCountSummary(tenantId),
    getAttendanceOverview(tenantId),
    db.payment.findMany({
      where: {
        tenantId,
        status: { in: ["OVERDUE", "PENDING"] },
      },
      take: 3,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        amount: true,
        student: { select: { name: true } },
      },
    }),
  ]);

  return {
    revenue: {
      thisMonth: revenue.thisMonth,
      lastMonth: revenue.lastMonth,
      change: revenue.change,
    },
    outstanding: revenue.outstanding,
    students,
    attendance,
    todaySessions,
    alerts: overdueStudents.map((item) => ({
      id: item.id,
      message: `مبلغ متأخر على ${item.student.name}`,
      amount: item.amount,
      severity: "high" as const,
    })),
  };
});

export const getStudentDashboardData = cache(async (tenantId: string, studentId: string) => {
  const [profile, attendance, payment, nextSession] = await Promise.all([
    getStudentProfile(tenantId, studentId),
    getStudentAttendanceSnapshot(tenantId, studentId),
    getStudentPaymentSnapshot(tenantId, studentId),
    db.session.findFirst({
      where: {
        tenantId,
        group: {
          students: {
            some: {
              studentId,
              status: "ACTIVE",
            },
          },
        },
        date: { gte: new Date() },
      },
      orderBy: [{ date: "asc" }, { timeStart: "asc" }],
      select: {
        date: true,
        timeStart: true,
        timeEnd: true,
        group: { select: { name: true } },
      },
    }),
  ]);

  return { profile, attendance, payment, nextSession };
});

export const getParentDashboardData = cache(async (tenantId: string, parentId: string) => {
  const children = await getParentChildren(tenantId, parentId);

  const childrenData = await Promise.all(
    children.map(async ({ student }) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [attendance, payment, todaySession, attendanceRecord, nextSession] = await Promise.all([
        getStudentAttendanceSnapshot(tenantId, student.id),
        getStudentPaymentSnapshot(tenantId, student.id),
        db.session.findFirst({
          where: {
            tenantId,
            group: {
              students: {
                some: {
                  studentId: student.id,
                  status: "ACTIVE",
                },
              },
            },
            date: { gte: todayStart, lte: todayEnd },
          },
          select: { id: true },
        }),
        db.attendance.findFirst({
          where: {
            tenantId,
            studentId: student.id,
            session: { date: { gte: todayStart, lte: todayEnd } },
          },
          select: { status: true },
        }),
        db.session.findFirst({
          where: {
            tenantId,
            group: {
              students: {
                some: {
                  studentId: student.id,
                  status: "ACTIVE",
                },
              },
            },
            date: { gt: new Date() },
          },
          orderBy: [{ date: "asc" }, { timeStart: "asc" }],
          select: {
            date: true,
            timeStart: true,
            group: { select: { name: true } },
          },
        }),
      ]);

      return {
        id: student.id,
        name: student.name,
        grade: student.gradeLevel ?? "غير محدد",
        attendanceRate: attendance.rate,
        payment,
        todayStatus: attendanceRecord?.status ?? (todaySession ? "NO_RECORD" : "NO_SESSION"),
        nextSession,
      };
    }),
  );

  return { children: childrenData };
});
