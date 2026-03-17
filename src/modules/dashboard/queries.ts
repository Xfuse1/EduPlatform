import { cache } from "react";

import { MOCK_PARENT_NEXT_SESSION, MOCK_STUDENT_NEXT_SESSION, MOCK_TEACHER_ALERTS, MOCK_TENANT } from "@/lib/mock-data";
import { getAttendanceOverview, getStudentAttendanceSnapshot, getTodaySessions } from "@/modules/attendance/queries";
import { getRevenueSummary, getStudentPaymentSnapshot } from "@/modules/payments/queries";
import { getParentChildren, getStudentCountSummary, getStudentProfile } from "@/modules/students/queries";

export const getTeacherDashboardData = cache(async (tenantId: string) => {
  const [revenue, todaySessions, students, attendance, overdueStudents] = await Promise.all([
    getRevenueSummary(tenantId),
    getTodaySessions(tenantId),
    getStudentCountSummary(tenantId),
    getAttendanceOverview(tenantId),
    Promise.resolve(MOCK_TEACHER_ALERTS),
  ]);

  return {
    teacherName: MOCK_TENANT.name,
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
      studentName: item.student.name,
      message: `مبلغ متأخر على ${item.student.name}`,
      amount: item.amount,
      severity: "high" as const,
    })),
  };
});

export const getStudentDashboardData = cache(async (tenantId: string, studentId: string) => {
  const [profile, attendance, payment] = await Promise.all([
    getStudentProfile(tenantId, studentId),
    getStudentAttendanceSnapshot(tenantId, studentId),
    getStudentPaymentSnapshot(tenantId, studentId),
  ]);

  return { profile, attendance, payment, nextSession: MOCK_STUDENT_NEXT_SESSION };
});

export const getParentDashboardData = cache(async (tenantId: string, parentId: string) => {
  const children = await getParentChildren(tenantId, parentId);

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
        todayStatus: "PRESENT",
        nextSession: MOCK_PARENT_NEXT_SESSION,
      };
    }),
  );

  return { children: childrenData };
});
