import { EnrollmentStatus } from "@prisma/client";
import { cache } from "react";

import { db } from "@/lib/db";
import { formatDisplayTime, getNextRecurringSession } from "@/lib/schedule";
import {
  getAttendanceOverview,
  getAttendanceSeries,
  getAttendanceSessions,
  getStudentAttendanceSnapshot,
  getStudentTodayStatus,
  getTodaySessions,
} from "@/modules/attendance/queries";
import { getTeacherScheduleItems } from "@/modules/groups/queries";
import { getNotificationLogs } from "@/modules/notifications/queries";
import {
  getOverduePayments,
  getPaymentsList,
  getRevenueSeries,
  getRevenueSummary,
  getStudentPaymentSnapshot,
} from "@/modules/payments/queries";
import { getParentChildren, getStudentCountSummary, getStudentProfile } from "@/modules/students/queries";
import { getTeachersPageData } from "@/modules/teachers/queries";

export const getTeacherDashboardData = cache(async (tenantId: string, teacherId?: string) => {
  const [tenant, revenue, revenueSeries, todaySessions, students, attendance, attendanceSeries, overdueStudents] =
    await Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
        },
      }),
      getRevenueSummary(tenantId, undefined, teacherId),
      getRevenueSeries(tenantId, teacherId),
      getTodaySessions(tenantId, teacherId),
      getStudentCountSummary(tenantId, teacherId),
      getAttendanceOverview(tenantId, teacherId),
      getAttendanceSeries(tenantId, teacherId),
      getOverduePayments(tenantId, 4, teacherId),
    ]);

  return {
    teacherName: tenant?.name ?? "السنتر",
    revenue: {
      thisMonth: revenue.thisMonth,
      lastMonth: revenue.lastMonth,
      change: revenue.change,
    },
    revenueSeries,
    outstanding: revenue.outstanding,
    students,
    attendance,
    attendanceSeries,
    todaySessions: todaySessions.map((session) => ({
      ...session,
      timeStart: session.timeStart,
      timeEnd: session.timeEnd,
    })),
    alerts: overdueStudents.map((item) => ({
      id: item.id,
      studentName: item.studentName,
      message: `مبلغ متأخر على ${item.studentName}`,
      amount: item.amount,
      severity: "high" as const,
    })),
  };
});

export const getCenterDashboardData = cache(async (tenantId: string) => {
  const [dashboard, teachersData, schedule, attendanceSessions, notifications] = await Promise.all([
    getTeacherDashboardData(tenantId),
    getTeachersPageData(tenantId),
    getTeacherScheduleItems(tenantId),
    getAttendanceSessions(tenantId),
    getNotificationLogs(tenantId),
  ]);

  return {
    summary: {
      revenueCollected: dashboard.revenue.thisMonth,
      outstandingAmount: dashboard.outstanding.total,
      attendanceRate: dashboard.attendance.rate,
      activeTeachers: teachersData.teachers.length,
      activeStudents: dashboard.students.total,
      liveSessions: attendanceSessions.filter((session) => session.status === "IN_PROGRESS").length,
    },
    revenueSeries: dashboard.revenueSeries,
    attendanceSeries: dashboard.attendanceSeries,
    alerts: dashboard.alerts,
    teachers: teachersData.teachers.slice(0, 5),
    schedule: schedule.slice(0, 6),
    liveAttendance: attendanceSessions.slice(0, 6).map((session) => ({
      id: session.id,
      sessionName: session.title,
      groupName: session.group,
      timeLabel: `${session.timeStart} - ${session.timeEnd}`,
      status: session.status,
      attendedCount: session.attended,
      totalCount: session.total,
    })),
    notifications: notifications.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.type,
      description: item.message,
      timeLabel: item.createdAt.toLocaleDateString("ar-EG"),
      channelLabel: item.channel,
      isUnread: item.status === "QUEUED" || item.status === "FAILED",
    })),
  };
});

export const getStudentDashboardData = cache(async (tenantId: string, studentId: string) => {
  const [profile, attendance, payment] = await Promise.all([
    getStudentProfile(tenantId, studentId),
    getStudentAttendanceSnapshot(tenantId, studentId),
    getStudentPaymentSnapshot(tenantId, studentId),
  ]);

  const nextSession = profile
    ? getNextRecurringSession(
        profile.enrollments.map((enrollment) => ({
          id: enrollment.group.id,
          name: enrollment.group.name,
          days: enrollment.group.days,
          timeStart: enrollment.group.timeStart,
          timeEnd: enrollment.group.timeEnd,
        })),
      )
    : null;

  return { profile, attendance, payment, nextSession };
});

export const getParentDashboardData = cache(async (tenantId: string, parentId: string) => {
  const children = await getParentChildren(tenantId, parentId);

  const childrenData = await Promise.all(
    children.map(async ({ student }) => {
      const enrolledGroupIds = student.enrollments.map((enrollment) => enrollment.group.id);

      const [attendance, payment, todayStatus, availableGroups] = await Promise.all([
        getStudentAttendanceSnapshot(student.tenantId, student.id),
        getStudentPaymentSnapshot(student.tenantId, student.id),
        getStudentTodayStatus(student.tenantId, student.id),
        db.group.findMany({
          where: {
            tenantId: student.tenantId,
            isActive: true,
            ...(student.gradeLevel
              ? {
                  gradeLevel: {
                    equals: student.gradeLevel,
                    mode: "insensitive",
                  },
                }
              : {}),
            ...(enrolledGroupIds.length
              ? {
                  id: {
                    notIn: enrolledGroupIds,
                  },
                }
              : {}),
          },
          orderBy: [{ subject: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            subject: true,
            gradeLevel: true,
            room: true,
            days: true,
            timeStart: true,
            timeEnd: true,
            monthlyFee: true,
            maxCapacity: true,
            color: true,
            students: {
              where: {
                status: {
                  in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLIST],
                },
              },
              select: {
                id: true,
              },
            },
          },
        }),
      ]);

      return {
        id: student.id,
        name: student.name,
        grade: student.gradeLevel ?? "غير محدد",
        tenantName: student.tenant.name,
        tenantSlug: student.tenant.slug,
        currentGroups: student.enrollments.map((enrollment) => ({
          id: enrollment.group.id,
          name: enrollment.group.name,
          subject: enrollment.group.subject,
        })),
        availableGroups: availableGroups.map((group) => {
          const enrolledCount = group.students.length;
          const remainingCapacity = Math.max(group.maxCapacity - enrolledCount, 0);

          return {
            id: group.id,
            name: group.name,
            subject: group.subject,
            gradeLevel: group.gradeLevel,
            room: group.room,
            days: group.days,
            timeStart: formatDisplayTime(group.timeStart),
            timeEnd: formatDisplayTime(group.timeEnd),
            monthlyFee: group.monthlyFee,
            enrolledCount,
            remainingCapacity,
            maxCapacity: group.maxCapacity,
            isFull: remainingCapacity === 0,
            color: group.color,
          };
        }),
        attendanceRate: attendance.rate,
        payment,
        todayStatus,
        nextSession: getNextRecurringSession(
          student.enrollments.map((enrollment) => ({
            id: enrollment.group.id,
            name: enrollment.group.name,
            days: enrollment.group.days,
            timeStart: enrollment.group.timeStart,
            timeEnd: enrollment.group.timeEnd,
          })),
        ),
      };
    }),
  );

  return { children: childrenData };
});

export const getCenterPaymentsOverview = cache(async (tenantId: string) => {
  const [payments, overdue, revenue] = await Promise.all([
    getPaymentsList(tenantId),
    getOverduePayments(tenantId, 6),
    getRevenueSummary(tenantId),
  ]);

  return {
    payments,
    overdue,
    revenue,
  };
});
