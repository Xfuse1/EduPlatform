import { cache } from "react";

import { db } from "@/lib/db";
import { getGradeLevelKey } from "@/lib/grade-levels";
import { getAssignmentsByStudent } from "@/modules/assignments/queries";
import { getAttendanceOverview, getStudentAttendanceSnapshot, getTodaySessions } from "@/modules/attendance/queries";
import { getRevenueSummary, getStudentPaymentSnapshot } from "@/modules/payments/queries";
import { getParentChildren, getStudentCountSummary, getStudentProfile } from "@/modules/students/queries";

const arabicDaysByIndex = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;

const englishDaysByIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function getNextDateForDay(dayName: string, fromDate: Date) {
  const normalized = dayName.toLowerCase().trim();
  
  let targetDayIndex = englishDaysByIndex.indexOf(normalized as (typeof englishDaysByIndex)[number]);
  
  if (targetDayIndex === -1) {
    targetDayIndex = arabicDaysByIndex.indexOf(dayName as (typeof arabicDaysByIndex)[number]);
  }

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

export const getAssignmentsByParent = cache(async (tenantId: string, parentId: string) => {
  try {
    const parentChildren = await db.parentStudent.findMany({
      where: {
        parentId,
      },
      include: {
        student: { select: { id: true, name: true } }
      }
    });

    const results = await Promise.all(
      parentChildren.map(async (pc) => {
        const student = pc.student;
        const assignments = await getAssignmentsByStudent(student.id);
        
        return assignments
          .filter((a: any) => a.status === "graded")
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            grade: a.submission?.grade || 0,
            maxGrade: 20, // This can be expanded to use a.maxGrade if it exists in schema
            childName: student.name,
            gradedByAi: a.submission?.gradedByAi || false
          }));
      })
    );

    return results.flat();
  } catch (error) {
    console.error("Failed to get parent assignments:", error);
    return [];
  }
});

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
      teacherName: tenant?.name ?? "المعلم",
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
    teacherName: "المعلم",
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
    const [profile, attendance, payment, assignments] = await Promise.all([
      getStudentProfile(tenantId, studentId),
      getStudentAttendanceSnapshot(tenantId, studentId),
      getStudentPaymentSnapshot(tenantId, studentId),
      getAssignmentsByStudent(studentId),
    ]);

    return {
      profile,
      attendance,
      payment,
      assignments,
      nextSession: getNextSessionFromEnrollments(profile?.enrollments ?? []),
    };
  } catch (error) {
    console.error("DB getStudentDashboardData failed, using fallback:", error);
  }

  const [profile, attendance, payment, assignments] = await Promise.all([
    getStudentProfile(tenantId, studentId),
    getStudentAttendanceSnapshot(tenantId, studentId),
    getStudentPaymentSnapshot(tenantId, studentId),
    getAssignmentsByStudent(studentId),
  ]);

  return { profile, attendance, payment, assignments, nextSession: null };
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

    const groups = await db.group.findMany({
        where: {
          isActive: true,
          tenant: { isActive: true },
        },
        select: {
          tenantId: true,
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
          groupStudents: {
            where: {
              status: "ACTIVE",
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    const childrenData = await Promise.all(
      children.map(async ({ student }) => {
        const [attendance, payment] = await Promise.all([
          getStudentAttendanceSnapshot(student.tenantId, student.id),
          getStudentPaymentSnapshot(student.tenantId, student.id),
        ]);

        const currentEnrollmentStatuses = new Set(["ACTIVE", "WAITLIST"]);
        const activeEnrollments = student.groupStudents.filter((enrollment) => enrollment.status === "ACTIVE");
        const currentEnrollments = student.groupStudents.filter((enrollment) => currentEnrollmentStatuses.has(enrollment.status));
        const enrolledGroupIds = new Set(currentEnrollments.map((enrollment) => enrollment.group.id));
        const studentGradeLevelKey = getGradeLevelKey(student.gradeLevel);

        const currentGroups = currentEnrollments.map((enrollment) => ({
          id: enrollment.group.id,
          name: enrollment.group.name,
          subject: enrollment.group.subject,
        }));

        const availableGroups = groups
          .filter((group) => !studentGradeLevelKey || getGradeLevelKey(group.gradeLevel) === studentGradeLevelKey)
          .filter((group) => !enrolledGroupIds.has(group.id))
          .map((group) => {
            const enrolledCount = group.groupStudents.length;
            const remainingCapacity = Math.max(group.maxCapacity - enrolledCount, 0);

            return {
              id: group.id,
              name: group.name,
              subject: group.subject,
              gradeLevel: group.gradeLevel,
              room: group.room,
              days: group.days,
              timeStart: group.timeStart,
              timeEnd: group.timeEnd,
              monthlyFee: group.monthlyFee,
              enrolledCount,
              remainingCapacity,
              maxCapacity: group.maxCapacity,
              isFull: remainingCapacity === 0,
              color: group.color,
            };
          });

        return {
          id: student.id,
          name: student.name,
          grade: student.gradeLevel ?? "غير محدد",
          tenantName: student.tenant.name,
          currentGroups,
          availableGroups,
          attendanceRate: attendance.rate,
          payment,
          todayStatus: attendance.records?.[0]?.status ?? "NO_SESSION",
          nextSession: getNextSessionFromEnrollments(
            activeEnrollments.map((enrollment) => ({
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
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        createdAt: n.createdAt,
      })),
      assignments: parentAssignments,
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
        tenantName: "السنتر",
        currentGroups: [],
        availableGroups: [],
        attendanceRate: 0,
        payment: {
          status: "PENDING" as const,
          amount: 0,
        },
        todayStatus: "NO_SESSION",
        nextSession: null,
      },
    ],
    notifications: [],
    assignments: [],
  };
});
export const getCenterDashboardData = cache(async (tenantId: string) => {
  const [teacherData, teachersCount, notifications, groups, revenue] = await Promise.all([
    getTeacherDashboardData(tenantId),
    db.user.count({
      where: {
        tenantId,
        role: "TEACHER",
        isActive: true,
      },
    }).catch(() => 0),
    db.notification.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }).catch(() => []),
    db.group.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: {
        timeStart: "asc",
      },
      take: 20,
    }).catch(() => []),
    getRevenueSummary(tenantId),
  ]);

  return {
    summary: {
      revenueCollected: teacherData.revenue.thisMonth,
      outstandingAmount: teacherData.outstanding.total,
      attendanceRate: teacherData.attendance.rate,
      activeTeachers: teachersCount,
      activeStudents: teacherData.students.total,
      liveSessions: teacherData.todaySessions.filter((session) => session.status === "IN_PROGRESS").length,
    },
    attendanceSeries: [
      {
        month: "الحالي",
        rate: teacherData.attendance.rate,
      },
      {
        month: "السابق",
        rate: Math.max(teacherData.attendance.rate - teacherData.attendance.change, 0),
      },
    ],
    revenueSeries: [
      {
        month: "السابق",
        revenue: revenue.lastMonth,
      },
      {
        month: "الحالي",
        revenue: revenue.thisMonth,
      },
    ],
    schedule: groups.flatMap((group) =>
      group.days.map((day) => ({
        id: `${group.id}-${day}`,
        subject: group.subject,
        day,
        timeStart: group.timeStart,
        timeEnd: group.timeEnd,
        room: null,
        color: group.color,
        isToday: false,
      })),
    ),
    alerts: teacherData.alerts,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.type,
      description: notification.message,
      timeLabel: new Intl.DateTimeFormat("ar-EG", {
        day: "numeric",
        month: "short",
      }).format(notification.createdAt),
      channelLabel: notification.channel,
      isUnread: notification.status === "QUEUED",
    })),
    liveAttendance: teacherData.todaySessions.map((session) => ({
      id: session.id,
      sessionName: session.group.name,
      attendedCount: session.attendanceCount,
      totalCount: session.totalStudents,
      timeLabel: `${session.timeStart} - ${session.timeEnd}`,
      groupName: session.group.name,
      status: session.status,
    })),
  };
});


