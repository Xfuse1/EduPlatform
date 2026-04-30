import { cache } from "react";

import { db } from "@/lib/db";
import { getGradeLevelKey } from "@/lib/grade-levels";
import { formatTimeRange12Hour } from "@/lib/utils";
import { getAssignmentsByStudent } from "@/modules/assignments/queries";
import { getAttendanceOverview, getStudentAttendanceSnapshot, getTodaySessions } from "@/modules/attendance/queries";
import { getRevenueSummary, getStudentPaymentSnapshot } from "@/modules/payments/queries";
import { getParentChildren, getStudentCountSummary, getStudentProfile } from "@/modules/students/queries";
import { getOrCreateWallet, resolveTenantPayeeUserId } from "@/modules/wallet/provider";

const arabicDaysByIndex = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;

const englishDaysByIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const ARABIC_MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
] as const;

function getLast6Months() {
  const now = new Date();
  const months: Array<{ year: number; month: number; label: string; start: Date; end: Date }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: ARABIC_MONTH_NAMES[d.getMonth()],
      start: d,
      end,
    });
  }

  return months;
}

export const getMonthlyRevenueSeries = cache(async (tenantId: string) => {
  try {
    const months = getLast6Months();
    const payments = await db.payment.findMany({
      where: {
        tenantId,
        status: "PAID",
        createdAt: { gte: months[0].start },
      },
      select: { amount: true, createdAt: true },
    });

    return months.map((m) => {
      const total = payments
        .filter((p) => p.createdAt >= m.start && p.createdAt < m.end)
        .reduce((sum, p) => sum + p.amount, 0);
      return { month: m.label, revenue: total };
    });
  } catch (error) {
    console.error("getMonthlyRevenueSeries failed:", error);
    return [];
  }
});

export const getMonthlyAttendanceSeries = cache(async (tenantId: string) => {
  try {
    const months = getLast6Months();
    const records = await db.attendance.findMany({
      where: {
        tenantId,
        markedAt: { gte: months[0].start },
      },
      select: { status: true, markedAt: true },
    });

    return months.map((m) => {
      const monthRecords = records.filter((r) => r.markedAt >= m.start && r.markedAt < m.end);
      const present = monthRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
      const rate = monthRecords.length > 0 ? Math.round((present / monthRecords.length) * 100) : 0;
      return { month: m.label, rate };
    });
  } catch (error) {
    console.error("getMonthlyAttendanceSeries failed:", error);
    return [];
  }
});

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
      teacherId?: string | null;
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
          teacherId: enrollment.group.teacherId ?? null,
          group: {
            name: enrollment.group.name,
          },
        };
      }),
    )
    .filter((item): item is { date: Date; timeStart: string; timeEnd: string; teacherId: string | null; group: { name: string } } => item !== null)
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  return upcoming[0] ?? null;
}

export const getAssignmentsByParent = cache(async (tenantId: string, parentId: string) => {
  try {
    const parentChildren = await db.parentStudent.findMany({
      where: {
        parentId,
        student: {
          tenantId,
        },
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
    const [
      revenue,
      todaySessions,
      students,
      attendance,
      tenant,
      overduePayments,
      repeatedAbsences,
      revenueSeries,
      attendanceSeries,
      teacherSubscription,
      withdrawalSummary,
    ] = await Promise.all([
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
      getMonthlyRevenueSeries(tenantId),
      getMonthlyAttendanceSeries(tenantId),
      db.teacherSubscription.findUnique({
        where: {
          tenantId,
        },
        select: {
          kashierApiKey: true,
          kashierMerId: true,
        },
      }),
      db.walletWithdrawal.groupBy({
        by: ["status"],
        where: { tenantId },
        _sum: { amount: true },
        _count: { status: true },
      }),
    ]);

    const teacherUserId = await resolveTenantPayeeUserId(tenantId);
    const wallet = await getOrCreateWallet(tenantId, teacherUserId);

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
      revenueSeries,
      attendanceSeries,
      kashierApiConfigured: !!(teacherSubscription?.kashierApiKey && teacherSubscription.kashierMerId),
      wallet: {
        balance: wallet.balance,
        transfers: withdrawalSummary.reduce(
          (acc, item) => {
            acc[item.status] = { amount: item._sum.amount ?? 0, count: item._count.status };
            return acc;
          },
          {
            PENDING: { amount: 0, count: 0 },
            RETRY: { amount: 0, count: 0 },
            SUCCESS: { amount: 0, count: 0 },
            FAILED: { amount: 0, count: 0 },
            fees: 0,
          } as Record<"PENDING" | "RETRY" | "SUCCESS" | "FAILED", { amount: number; count: number }> & { fees: number },
        ),
      },
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
    revenueSeries: [],
    attendanceSeries: [],
    kashierApiConfigured: false,
    wallet: {
      balance: 0,
      transfers: {
        PENDING: { amount: 0, count: 0 },
        RETRY: { amount: 0, count: 0 },
        SUCCESS: { amount: 0, count: 0 },
        FAILED: { amount: 0, count: 0 },
        fees: 0,
      },
    },
  };
});

export const getStudentDashboardData = cache(async (_tenantId: string, studentId: string) => {
  try {
    // 1. Fetch Student Profile with ALL enrollments across all tenants
    const student = await db.user.findUnique({
      where: { id: studentId },
      include: {
        groupStudents: {
          include: {
            group: {
              include: {
                tenant: { select: { name: true } },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
        childStudents: {
          include: {
            parent: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!student) throw new Error("Student not found");

    // 2. Fetch All Payments across all tenants
    const payments = await db.payment.findMany({
      where: { studentId },
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch All Attendance across all tenants
    const attendanceRecords = await db.attendance.findMany({
      where: { studentId },
      include: {
        tenant: { select: { name: true } },
        group: { select: { name: true } },
        session: { select: { date: true } },
      },
      orderBy: { markedAt: "desc" },
      take: 20,
    });

    // 4. Fetch All Assignments across all tenants
    const groupIds = student.groupStudents.map((gs) => gs.groupId);
    const assignments = await db.assignment.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        tenant: { select: { name: true } },
        group: { select: { name: true, subject: true } },
        submissions: { where: { studentId } },
      },
      orderBy: { dueDate: "asc" },
    });

    // 5. Fetch All Exams across all tenants
    const exams = await db.exam.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        tenant: { select: { name: true } },
        group: { select: { name: true } },
        submissions: { where: { studentId } },
      },
      orderBy: { startAt: "desc" },
    });

    // Process assignments to match the format expected by the UI and include tenant names
    const mappedAssignments = assignments.map((a) => {
      const submission = a.submissions[0] || null;
      let status: "pending" | "submitted" | "graded" | "overdue" = "pending";
      if (submission) {
        status = submission.grade !== null ? "graded" : "submitted";
      } else if (a.dueDate && new Date() > new Date(a.dueDate)) {
        status = "overdue";
      }
      return {
        ...a,
        submission,
        status,
        group: {
          ...a.group,
          // Include tenant name in group name for display in Assignment cards
          name: `${a.group.name} — ${a.tenant.name}`,
        },
      };
    });

    // Calculate Aggregates
    const attendedCount = attendanceRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    const attendanceRate = attendanceRecords.length > 0 ? Math.round((attendedCount / attendanceRecords.length) * 100) : 0;

    const latestPayment = payments[0];
    const parent = student.childStudents[0]?.parent;

    return {
      profile: {
        student: {
          name: student.name,
          phone: student.phone.startsWith("student-") ? "" : student.phone,
          parentName: parent?.name ?? student.parentName ?? null,
          parentPhone: parent?.phone ?? student.parentPhone ?? null,
          gradeLevel: student.gradeLevel,
        },
        enrollments: student.groupStudents.map((gs) => ({
          group: {
            id: gs.group.id,
            name: gs.group.name,
            days: gs.group.days,
            timeStart: gs.group.timeStart,
            timeEnd: gs.group.timeEnd,
            tenantName: gs.group.tenant.name,
            subject: gs.group.subject,
            color: gs.group.color,
          },
        })),
      },
      attendance: {
        rate: attendanceRate,
        records: attendanceRecords,
      },
      payment: {
        status: latestPayment?.status ?? "PAID",
        amount: latestPayment && latestPayment.status !== "PAID" ? latestPayment.amount : 0,
        payments: payments.map((p) => ({
          ...p,
          tenantName: p.tenant.name,
        })),
      },
      assignments: mappedAssignments,
      exams: exams.map((e) => ({
        ...e,
        tenantName: e.tenant.name,
        myScore: e.submissions[0]?.totalGrade ?? null,
      })),
      nextSession: getNextSessionFromEnrollments(student.groupStudents),
    };
  } catch (error) {
    console.error("Unified getStudentDashboardData failed:", error);
    return {
      profile: null,
      attendance: { rate: 0, records: [] },
      payment: { status: "PAID", amount: 0, payments: [] },
      assignments: [],
      exams: [],
      nextSession: null,
    };
  }
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

    console.log("🔍 parentId:", parentId, "children count:", children.length, "children:", JSON.stringify(children.map(c => c.student.name)));

    const childTenantIds = Array.from(new Set(
      children.flatMap(({ student }) =>
        student.groupStudents.map((enrollment) => enrollment.group.tenantId),
      ),
    ));
    const groups = childTenantIds.length ? await db.group.findMany({
        where: {
          tenantId: { in: childTenantIds },
          isActive: true,
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
          tenant: {
            select: {
              name: true,
            },
          },
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
      }) : [];

    const childrenData = await Promise.all(
      children.map(async ({ student }) => {
        const currentEnrollmentStatuses = new Set(["ACTIVE", "WAITLIST"]);
        const activeEnrollments = student.groupStudents.filter((enrollment) => enrollment.status === "ACTIVE");
        const currentEnrollments = student.groupStudents.filter((enrollment) => currentEnrollmentStatuses.has(enrollment.status));
        const scopedTenantId = activeEnrollments[0]?.group.tenantId ?? currentEnrollments[0]?.group.tenantId ?? student.tenantId;
        const [attendance, payment] = await Promise.all([
          getStudentAttendanceSnapshot(scopedTenantId, student.id),
          getStudentPaymentSnapshot(scopedTenantId, student.id),
        ]);
        const enrolledGroupIds = new Set(currentEnrollments.map((enrollment) => enrollment.group.id));
        const studentGradeLevelKey = getGradeLevelKey(student.gradeLevel);

        const currentGroups = currentEnrollments.map((enrollment) => ({
          id: enrollment.group.id,
          name: enrollment.group.name,
          subject: enrollment.group.subject,
          tenantName: enrollment.group.tenant?.name ?? null,
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
              tenantName: group.tenant.name,
            };
          });

        return {
          id: student.id,
          name: student.name,
          phone: student.phone.startsWith("student-") ? "" : student.phone,
          grade: student.gradeLevel ?? "غير محدد",
          tenantName: currentEnrollments[0]?.group.tenant?.name ?? student.tenant.name,
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
                teacherId: enrollment.group.teacherId,
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
    children: [],
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
      timeLabel: formatTimeRange12Hour(session.timeStart, session.timeEnd),
      groupName: session.group.name,
      status: session.status,
    })),
  };
});



