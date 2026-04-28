import { cache } from "react";

import { EnrollmentStatus, type Prisma } from "@/generated/client";
import { db } from "@/lib/db";

const ACTIVE_ENROLLMENT_STATUSES = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.WAITLIST,
  EnrollmentStatus.PENDING,
];

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

type StudentPaymentStatus = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

function toStudentPaymentStatus(status?: string | null): StudentPaymentStatus {
  if (status === "PAID" || status === "PARTIAL" || status === "OVERDUE") {
    return status;
  }

  return "PENDING";
}

export const getStudentCountSummary = cache(async (tenantId: string) => {
  try {
    const [totalEnrollments, recentEnrollments] = await Promise.all([
      db.groupStudent.findMany({
        where: {
          status: {
            in: ACTIVE_ENROLLMENT_STATUSES,
          },
          group: {
            tenantId,
          },
          student: {
            role: "STUDENT",
            isActive: true,
          },
        },
        distinct: ["studentId"],
        select: { studentId: true },
      }),
      db.groupStudent.findMany({
        where: {
          status: {
            in: ACTIVE_ENROLLMENT_STATUSES,
          },
          enrolledAt: {
            gte: startOfMonth(),
          },
          group: {
            tenantId,
          },
          student: {
            role: "STUDENT",
            isActive: true,
          },
        },
        distinct: ["studentId"],
        select: { studentId: true },
      }),
    ]);

    const total = totalEnrollments.length;
    const newThisMonth = recentEnrollments.length;

    return {
      total,
      newThisMonth,
      recent: newThisMonth,
    };
  } catch (error) {
    console.error("DB getStudentCountSummary failed, using mock:", error);
  }

  return { total: 0, newThisMonth: 0, recent: 0 };
});

export const getStudentProfile = cache(async (tenantId: string, studentId: string, _teacherId?: string) => {
  try {
    const student = await db.user.findFirst({
      where: {
        id: studentId,
        role: "STUDENT",
        OR: [
          { tenantId },
          {
            groupStudents: {
              some: {
                status: {
                  in: ACTIVE_ENROLLMENT_STATUSES,
                },
                group: {
                  tenantId,
                  ...(_teacherId ? { teacherId: _teacherId } : {}),
                },
              },
            },
          },
        ],
      },
      include: {
        childStudents: {
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        groupStudents: {
          include: {
            group: {
              include: {
                tenant: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            enrolledAt: "desc",
          },
        },
        payments: {
          where: {
            tenantId,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        attendances: {
          where: {
            tenantId,
          },
          orderBy: {
            markedAt: "desc",
          },
          take: 10,
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
        },
      },
    });

    if (student) {
      const parent = student.childStudents[0]?.parent;
      const latestPayment = student.payments[0];
      const activeGroupStatuses = new Set(["ACTIVE", "WAITLIST"]);
      const visibleGroupStudents = student.groupStudents.filter((enrollment) => {
        if (!activeGroupStatuses.has(enrollment.status)) {
          return false;
        }

        if (!_teacherId) {
          return true;
        }

        return enrollment.group.tenantId === tenantId && enrollment.group.teacherId === _teacherId;
      });
      const enrolledGroups = visibleGroupStudents
        .map((enrollment) => ({
          id: enrollment.group.id,
          name: enrollment.group.name,
          subject: enrollment.group.subject,
          gradeLevel: enrollment.group.gradeLevel,
          color: enrollment.group.color,
          tenantName: enrollment.group.tenant.name,
          enrollmentStatus: enrollment.status as "ACTIVE" | "WAITLIST",
        }));
      const recentAttendance = student.attendances.map((record) => ({
        id: record.id,
        status: record.status,
        markedAt: record.markedAt,
        group: {
          name: record.group.name,
        },
        session: {
          date: record.session.date,
        },
      }));
      const attendedCount = student.attendances.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
      const attendanceRate = student.attendances.length > 0 ? Math.round((attendedCount / student.attendances.length) * 100) : 0;

      return {
        student: {
          name: student.name,
          phone: student.phone.startsWith("student-") ? "" : student.phone,
          parentName: parent?.name ?? student.parentName ?? null,
          parentPhone: parent?.phone ?? student.parentPhone ?? null,
          gradeLevel: student.gradeLevel,
        },
        attendanceRate,
        paymentStatus: toStudentPaymentStatus(latestPayment?.status),
        paymentHistory: student.payments.map((payment) => ({
          id: payment.id,
          month: payment.month,
          amount: payment.amount,
          status: payment.status,
          paidAt: payment.paidAt,
          notes: payment.notes,
        })),
        enrolledGroups,
        recentAttendance,
        enrollments: enrolledGroups.map((group) => {
          const enrollment = visibleGroupStudents.find((item) => item.group.id === group.id);
          return {
            group: {
              id: group.id,
              name: group.name,
              days: enrollment?.group.days ?? [],
              timeStart: enrollment?.group.timeStart ?? "",
              timeEnd: enrollment?.group.timeEnd ?? "",
              tenantName: enrollment?.group.tenant.name ?? "",
            },
          };
        }),
      };
    }
  } catch (error) {
    console.error("DB getStudentProfile failed, using mock:", error);
  }

  return null;
});

export const getParentChildren = cache(async (_tenantId: string, parentId: string) => {
  try {
    const children = await db.parentStudent.findMany({
      where: {
        parentId,
      },
      include: {
        student: {
          include: {
            tenant: {
              select: {
                name: true,
              },
            },
            groupStudents: {
              where: {
                status: {
                  in: ["ACTIVE", "WAITLIST"],
                },
              },
              include: {
                group: {
                  include: {
                    tenant: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return children;
  } catch (error) {
    console.error("DB getParentChildren failed, using mock:", error);
  }

  return [];
});

export const getStudents = cache(async (
  tenantId: string,
  filters: {
    search?: string;
    groupId?: string;
    paymentStatus?: string;
  } = {},
  _teacherId?: string,
) => {
  try {
    const resolveSessionStart = (session: { date: Date; timeStart: string }) => {
      const sessionDate = new Date(session.date);
      const timeMatch = session.timeStart.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

      if (timeMatch) {
        sessionDate.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
      } else {
        sessionDate.setHours(0, 0, 0, 0);
      }

      return sessionDate;
    };

    const activeEnrollmentWhere: Prisma.GroupStudentWhereInput = {
      status: {
        in: ACTIVE_ENROLLMENT_STATUSES,
      },
      group: {
        tenantId,
        ...(_teacherId ? { teacherId: _teacherId } : {}),
      },
    };

    const searchWhere: Prisma.UserWhereInput | undefined = filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { phone: { contains: filters.search } },
          ],
        }
      : undefined;

    const studentScopeWhere: Prisma.UserWhereInput = filters.groupId
      ? {
          groupStudents: {
            some: {
              groupId: filters.groupId,
              status: {
                in: ACTIVE_ENROLLMENT_STATUSES,
              },
              group: {
                tenantId,
                ...(_teacherId ? { teacherId: _teacherId } : {}),
              },
            },
          },
        }
      : {
          OR: [
            {
              groupStudents: {
                some: activeEnrollmentWhere,
              },
            },
            {
              tenantId,
              groupStudents: {
                none: activeEnrollmentWhere,
              },
            },
          ],
        };

    const students = await db.user.findMany({
      where: {
        role: "STUDENT",
        AND: [searchWhere, studentScopeWhere].filter(Boolean) as Prisma.UserWhereInput[],
      },
      include: {
        childStudents: {
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        groupStudents: {
          where: activeEnrollmentWhere,
          include: {
            group: {
              select: {
                id: true,
                name: true,
                subject: true,
                gradeLevel: true,
              },
            },
          },
        },
        payments: {
          where: {
            tenantId,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
        attendances: {
          where: {
            tenantId,
          },
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const studentIds = students.map((student) => student.id);
    const groupIds = Array.from(new Set(students.flatMap((student) => student.groupStudents.map((enrollment) => enrollment.group.id))));
    const now = new Date();

    const sessions = groupIds.length
      ? await db.session.findMany({
          where: {
            tenantId,
            groupId: { in: groupIds },
            date: { lte: now },
          },
          select: {
            id: true,
            groupId: true,
            date: true,
            timeStart: true,
          },
          orderBy: [{ date: "desc" }, { timeStart: "desc" }],
        })
      : [];
    const pastSessions = sessions.filter((session) => resolveSessionStart(session) <= now);

    const sessionIds = pastSessions.map((session) => session.id);
    const attendanceRecords = sessionIds.length && studentIds.length
      ? await db.attendance.findMany({
          where: {
            tenantId,
            studentId: { in: studentIds },
            sessionId: { in: sessionIds },
          },
          select: {
            studentId: true,
            sessionId: true,
            status: true,
          },
        })
      : [];

    const attendanceStatusByKey = new Map(
      attendanceRecords.map((record) => [`${record.studentId}:${record.sessionId}`, record.status] as const),
    );

    const sessionsByGroup = pastSessions.reduce((acc, session) => {
      const list = acc.get(session.groupId) ?? [];
      list.push(session);
      acc.set(session.groupId, list);
      return acc;
    }, new Map<string, typeof sessions>());

    const getConsecutiveAbsences = (studentId: string, groupId: string, enrolledAt?: Date | null) => {
      const enrollmentDate = enrolledAt ? new Date(enrolledAt) : null;
      const groupSessions = (sessionsByGroup.get(groupId) ?? []).filter((session) => {
        if (!enrollmentDate) {
          return true;
        }

        return resolveSessionStart(session) >= enrollmentDate;
      });
      let streak = 0;

      for (const session of groupSessions) {
        const status = attendanceStatusByKey.get(`${studentId}:${session.id}`);
        if (status === "PRESENT" || status === "LATE") {
          break;
        }
        if (!status) {
          break;
        }

        streak += 1;
      }

      return streak;
    };

    const mappedStudents = students.flatMap((student) => {
      const latestPayment = student.payments[0];
      const paymentStatus = toStudentPaymentStatus(latestPayment?.status);
      const attendedCount = student.attendances.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
      const attendance = student.attendances.length > 0 ? Math.round((attendedCount / student.attendances.length) * 100) : 0;
      const parent = student.childStudents[0]?.parent;
      const groups = student.groupStudents.map((enrollment) => ({
        id: enrollment.group.id,
        name: enrollment.group.name,
      }));

      return student.groupStudents.map((enrollment) => {
        const consecutiveAbsences = getConsecutiveAbsences(student.id, enrollment.group.id, enrollment.enrolledAt);
        const studentStatus: "ACTIVE" | "SUSPENDED" = !student.isActive ? "SUSPENDED" : "ACTIVE";

        return {
          id: student.id,
          name: student.name,
          phone: student.phone.startsWith("student-") ? "" : student.phone,
          studentPhone: student.phone.startsWith("student-") ? "" : student.phone,
          parentName: parent?.name ?? student.parentName ?? "",
          parentPhone: parent?.phone ?? student.parentPhone ?? "",
          parentId: parent?.id,
          grade: student.gradeLevel ?? "غير محدد",
          gradeLevel: student.gradeLevel ?? "",
          group: enrollment.group.name,
          groupId: enrollment.group.id,
          enrollmentStatus: enrollment.status,
          groups,
          studentStatus,
          consecutiveAbsences,
          paymentStatus,
          attendance,
          amountDue: latestPayment && latestPayment.status !== "PAID" ? latestPayment.amount : 0,
        };
      });
    });

    const studentWithNoGroups = students.filter((student) => student.groupStudents.length === 0);
    const mappedNoGroups = studentWithNoGroups.map((student) => {
      const latestPayment = student.payments[0];
      const paymentStatus = toStudentPaymentStatus(latestPayment?.status);
      const attendedCount = student.attendances.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
      const attendance = student.attendances.length > 0 ? Math.round((attendedCount / student.attendances.length) * 100) : 0;
      const parent = student.childStudents[0]?.parent;
      const studentStatus: "ACTIVE" | "SUSPENDED" = student.isActive ? "ACTIVE" : "SUSPENDED";

      return {
        id: student.id,
        name: student.name,
        phone: student.phone.startsWith("student-") ? "" : student.phone,
        studentPhone: student.phone.startsWith("student-") ? "" : student.phone,
        parentName: parent?.name ?? student.parentName ?? "",
        parentPhone: parent?.phone ?? student.parentPhone ?? "",
        parentId: parent?.id,
        grade: student.gradeLevel ?? "غير محدد",
        gradeLevel: student.gradeLevel ?? "",
        group: "غير محدد",
        groupId: "",
        enrollmentStatus: "NONE",
        groups: [],
        studentStatus,
        consecutiveAbsences: 0,
        paymentStatus,
        attendance,
        amountDue: latestPayment && latestPayment.status !== "PAID" ? latestPayment.amount : 0,
      };
    });

    const finalStudents = [...mappedStudents, ...mappedNoGroups];

    if (filters.paymentStatus) {
      return finalStudents.filter((student) => student.paymentStatus === filters.paymentStatus);
    }

    return finalStudents;
  } catch (error) {
    console.error("DB getStudents failed, using mock:", error);
  }

  return [];
});

export const getStudentsList = cache(async (tenantId: string) => {
  return getStudents(tenantId);
});

export const getStudentById = cache(async (tenantId: string, studentId: string, teacherId?: string) => {
  const profile = await getStudentProfile(tenantId, studentId, teacherId);
  return profile ?? null;
});
