import { cache } from "react";

import { db } from "@/lib/db";


function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function toStudentPaymentStatus(status?: string | null) {
  if (status === "PAID" || status === "PARTIAL" || status === "OVERDUE") {
    return status;
  }

  return "PENDING";
}

export const getStudentCountSummary = cache(async (tenantId: string) => {
  try {
    const [total, newThisMonth] = await Promise.all([
      db.user.count({
        where: {
          tenantId,
          role: "STUDENT",
        },
      }),
      db.user.count({
        where: {
          tenantId,
          role: "STUDENT",
          createdAt: {
            gte: startOfMonth(),
          },
        },
      }),
    ]);

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
        tenantId,
        role: "STUDENT",
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
            group: true,
          },
          orderBy: {
            enrolledAt: "desc",
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        attendances: {
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
      const enrolledGroups = student.groupStudents
        .filter((enrollment) => activeGroupStatuses.has(enrollment.status))
        .map((enrollment) => ({
          id: enrollment.group.id,
          name: enrollment.group.name,
          subject: enrollment.group.subject,
          gradeLevel: enrollment.group.gradeLevel,
          color: enrollment.group.color,
          enrollmentStatus: enrollment.status,
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
          const enrollment = student.groupStudents.find((item) => item.group.id === group.id);
          return {
            group: {
              id: group.id,
              name: group.name,
              days: enrollment?.group.days ?? [],
              timeStart: enrollment?.group.timeStart ?? "",
              timeEnd: enrollment?.group.timeEnd ?? "",
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

export const getParentChildren = cache(async (tenantId: string, parentId: string) => {
  try {
    const children = await db.parentStudent.findMany({
      where: {
        parentId,
        student: {
          tenantId,
        },
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
                group: true,
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
    const students = await db.user.findMany({
      where: {
        tenantId,
        role: "STUDENT",
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { phone: { contains: filters.search } },
              ],
            }
          : {}),
        ...(filters.groupId
          ? {
              groupStudents: {
                some: {
                  groupId: filters.groupId,
                  status: {
                    in: ["ACTIVE", "WAITLIST", "PENDING"],
                  },
                },
              },
            }
          : {}),
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
          where: {
            status: {
              in: ["ACTIVE", "WAITLIST", "PENDING"],
            },
          },
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

    const mappedStudents = students.flatMap((student) => {
      // If a student is in multiple groups, we might want to see each enrollment if pending
      // For now, let's map them but ensure we handle the PENDING status correctly.
      
      const latestPayment = student.payments[0];
      const paymentStatus = toStudentPaymentStatus(latestPayment?.status);
      const attendedCount = student.attendances.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
      const attendance = student.attendances.length > 0 ? Math.round((attendedCount / student.attendances.length) * 100) : 0;
      const parent = student.childStudents[0]?.parent;
      
      return student.groupStudents.map(enrollment => {
        const primaryGroup = enrollment.group;
        return {
          id: student.id,
          name: student.name,
          phone: student.phone.startsWith("student-") ? "" : student.phone,
          studentPhone: student.phone.startsWith("student-") ? "" : student.phone,
          parentName: parent?.name ?? student.parentName ?? "",
          parentPhone: parent?.phone ?? student.parentPhone ?? "",
          parentId: parent?.id,
          grade: student.gradeLevel ?? "غير محدد",
          gradeLevel: student.gradeLevel,
          group: primaryGroup.name,
          groupId: primaryGroup.id,
          enrollmentStatus: enrollment.status,
          paymentStatus,
          attendance,
          amountDue: latestPayment && latestPayment.status !== "PAID" ? latestPayment.amount : 0,
        };
      });
    });

    // If student has no groups, they won't appear in the list above due to map over groupStudents.
    // Let's add them back if they have no groups.
    const studentWithNoGroups = students.filter(s => s.groupStudents.length === 0);
    const mappedNoGroups = studentWithNoGroups.map(student => {
       const latestPayment = student.payments[0];
       const paymentStatus = toStudentPaymentStatus(latestPayment?.status);
       const attendedCount = student.attendances.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
       const attendance = student.attendances.length > 0 ? Math.round((attendedCount / student.attendances.length) * 100) : 0;
       const parent = student.childStudents[0]?.parent;
       return {
          id: student.id,
          name: student.name,
          phone: student.phone.startsWith("student-") ? "" : student.phone,
          studentPhone: student.phone.startsWith("student-") ? "" : student.phone,
          parentName: parent?.name ?? student.parentName ?? "",
          parentPhone: parent?.phone ?? student.parentPhone ?? "",
          parentId: parent?.id,
          grade: student.gradeLevel ?? "غير محدد",
          gradeLevel: student.gradeLevel,
          group: "غير محدد",
          groupId: "",
          enrollmentStatus: "NONE",
          paymentStatus,
          attendance,
          amountDue: latestPayment && latestPayment.status !== "PAID" ? latestPayment.amount : 0,
       };
    });

    const finalStudents = [...mappedStudents, ...mappedNoGroups];

    if (filters.search) {
      // already filtered by db but good to be sure if mapping changed things
    }

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
