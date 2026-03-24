import { cache } from "react";
import { PaymentStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { formatDisplayTime } from "@/lib/schedule";

function getAttendanceRate(statuses: string[]) {
  if (statuses.length === 0) {
    return 0;
  }

  const attendedCount = statuses.filter((status) => status !== "ABSENT").length;
  return Math.round((attendedCount / statuses.length) * 100);
}

function getPaymentSummary(payments: Array<{ status: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE"; amount: number }>) {
  const amountDue = payments.filter((payment) => payment.status !== "PAID").reduce((sum, payment) => sum + payment.amount, 0);

  if (payments.some((payment) => payment.status === "OVERDUE")) {
    return { status: "OVERDUE" as const, amountDue };
  }

  if (payments.some((payment) => payment.status === "PARTIAL")) {
    return { status: "PARTIAL" as const, amountDue };
  }

  if (payments.some((payment) => payment.status === "PENDING")) {
    return { status: "PENDING" as const, amountDue };
  }

  return { status: "PAID" as const, amountDue: 0 };
}

function matchesStudentSearch(student: { name: string; phone: string; parentPhone: string | null; gradeLevel: string | null }, search: string) {
  if (!search) {
    return true;
  }

  const normalized = search.trim().toLowerCase();

  return (
    student.name.toLowerCase().includes(normalized) ||
    student.phone.toLowerCase().includes(normalized) ||
    (student.parentPhone ?? "").toLowerCase().includes(normalized) ||
    (student.gradeLevel ?? "").toLowerCase().includes(normalized)
  );
}

export const getStudentCountSummary = cache(async (tenantId: string, teacherId?: string) => {
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const [total, recent] = await Promise.all([
    db.user.count({
      where: {
        tenantId,
        role: "STUDENT",
        isActive: true,
        ...(teacherId
          ? {
              enrollments: {
                some: {
                  status: {
                    in: ["ACTIVE", "WAITLIST"],
                  },
                  group: {
                    teacherId,
                  },
                },
              },
            }
          : {}),
      },
    }),
    db.user.count({
      where: {
        tenantId,
        role: "STUDENT",
        isActive: true,
        ...(teacherId
          ? {
              enrollments: {
                some: {
                  status: {
                    in: ["ACTIVE", "WAITLIST"],
                  },
                  group: {
                    teacherId,
                  },
                },
              },
            }
          : {}),
        createdAt: {
          gte: currentMonthStart,
        },
      },
    }),
  ]);

  return { total, recent };
});

export const getStudentProfile = cache(async (tenantId: string, studentId: string, teacherId?: string) => {
  const student = await db.user.findFirst({
    where: {
      tenantId,
      id: studentId,
      role: "STUDENT",
      ...(teacherId
        ? {
            enrollments: {
              some: {
                status: {
                  in: ["ACTIVE", "WAITLIST"],
                },
                group: {
                  teacherId,
                },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      gradeLevel: true,
      parentName: true,
      parentPhone: true,
      enrollments: {
        where: {
          status: {
            in: ["ACTIVE", "WAITLIST"],
          },
          ...(teacherId
            ? {
                group: {
                  teacherId,
                },
              }
            : {}),
        },
        select: {
          status: true,
          group: {
            select: {
              id: true,
              name: true,
              subject: true,
              gradeLevel: true,
              color: true,
              timeStart: true,
              timeEnd: true,
              days: true,
            },
          },
        },
      },
      attendanceRecords: {
        ...(teacherId
          ? {
              where: {
                group: {
                  teacherId,
                },
              },
            }
          : {}),
        orderBy: {
          markedAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          status: true,
          markedAt: true,
          session: {
            select: {
              date: true,
              group: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      studentPayments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
        select: {
          id: true,
          month: true,
          amount: true,
          status: true,
          paidAt: true,
          notes: true,
        },
      },
    },
  });

  if (!student) {
    return null;
  }

  const paymentSummary = getPaymentSummary(student.studentPayments);
  const attendanceRate = getAttendanceRate(student.attendanceRecords.map((record) => record.status));
  const enrollments = student.enrollments.map((enrollment) => ({
    ...enrollment,
    group: {
      ...enrollment.group,
      timeStart: formatDisplayTime(enrollment.group.timeStart),
      timeEnd: formatDisplayTime(enrollment.group.timeEnd),
    },
  }));

  return {
    id: student.id,
    name: student.name,
    gradeLevel: student.gradeLevel,
    enrollments: enrollments.map((enrollment) => ({
      group: {
        id: enrollment.group.id,
        name: enrollment.group.name,
        timeStart: enrollment.group.timeStart,
        timeEnd: enrollment.group.timeEnd,
        days: enrollment.group.days,
      },
    })),
    student: {
      name: student.name,
      phone: student.phone,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      gradeLevel: student.gradeLevel,
    },
    attendanceRate,
    paymentStatus: paymentSummary.status,
    paymentHistory: student.studentPayments,
    enrolledGroups: enrollments.map((enrollment) => ({
      id: enrollment.group.id,
      name: enrollment.group.name,
      subject: enrollment.group.subject,
      gradeLevel: enrollment.group.gradeLevel,
      color: enrollment.group.color,
      enrollmentStatus: enrollment.status,
    })),
    recentAttendance: student.attendanceRecords.map((record) => ({
      id: record.id,
      status: record.status,
      markedAt: record.markedAt,
      group: {
        name: record.session.group.name,
      },
      session: {
        date: record.session.date,
      },
    })),
  };
});

export const getParentChildren = cache(async (tenantId: string, parentId: string) => {
  const relations = await db.parentStudent.findMany({
    where: {
      parentId,
      parent: {
        tenantId,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      relationship: true,
      student: {
        select: {
          id: true,
          tenantId: true,
          name: true,
          gradeLevel: true,
          tenant: {
            select: {
              name: true,
              slug: true,
            },
          },
          enrollments: {
            where: {
              status: "ACTIVE",
            },
            select: {
              group: {
                select: {
                  id: true,
                  name: true,
                  days: true,
                  timeStart: true,
                  timeEnd: true,
                  room: true,
                  color: true,
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return relations.map((relation) => ({
    relationship: relation.relationship,
    student: {
      ...relation.student,
      enrollments: relation.student.enrollments.map((enrollment) => ({
        group: {
          ...enrollment.group,
          timeStart: formatDisplayTime(enrollment.group.timeStart),
          timeEnd: formatDisplayTime(enrollment.group.timeEnd),
        },
      })),
    },
  }));
});

export const getStudentsList = cache(async (tenantId: string, teacherId?: string) => {
  const students = await db.user.findMany({
    where: {
      tenantId,
      role: "STUDENT",
      isActive: true,
      ...(teacherId
        ? {
            enrollments: {
              some: {
                status: "ACTIVE",
                group: {
                  teacherId,
                },
              },
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      enrollments: {
        where: {
          status: "ACTIVE",
          ...(teacherId
            ? {
                group: {
                  teacherId,
                },
              }
            : {}),
        },
        select: {
          group: {
            select: {
              name: true,
            },
          },
        },
      },
      attendanceRecords: {
        ...(teacherId
          ? {
              where: {
                group: {
                  teacherId,
                },
              },
            }
          : {}),
        select: {
          status: true,
        },
      },
      studentPayments: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          status: true,
          amount: true,
        },
      },
    },
  });

  return students.map((student) => {
    const paymentSummary = getPaymentSummary(student.studentPayments);

    return {
      id: student.id,
      name: student.name,
      grade: student.gradeLevel ?? "غير محدد",
      group: student.enrollments.map((enrollment) => enrollment.group.name).join(" • ") || "بدون مجموعة",
      paymentStatus: paymentSummary.status,
      attendance: getAttendanceRate(student.attendanceRecords.map((record) => record.status)),
      amountDue: paymentSummary.amountDue,
    };
  });
});

export async function getStudents(
  tenantId: string,
  filters: {
    search?: string;
    groupId?: string;
    paymentStatus?: PaymentStatus;
  } = {},
  teacherId?: string,
) {
  const students = await db.user.findMany({
    where: {
      tenantId,
      role: "STUDENT",
      isActive: true,
      ...(filters.groupId || teacherId
        ? {
            enrollments: {
              some: {
                status: {
                  in: ["ACTIVE", "WAITLIST"],
                },
                ...(filters.groupId ? { groupId: filters.groupId } : {}),
                ...(teacherId
                  ? {
                      group: {
                        teacherId,
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      phone: true,
      gradeLevel: true,
      parentName: true,
      parentPhone: true,
      enrollments: {
        where: {
          status: {
            in: ["ACTIVE", "WAITLIST"],
          },
          ...(teacherId
            ? {
                group: {
                  teacherId,
                },
              }
            : {}),
        },
        select: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      attendanceRecords: {
        ...(teacherId
          ? {
              where: {
                group: {
                  teacherId,
                },
              },
            }
          : {}),
        select: {
          status: true,
        },
      },
      studentPayments: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          status: true,
          amount: true,
        },
      },
    },
  });

  return students
    .filter((student) => matchesStudentSearch(student, filters.search ?? ""))
    .map((student) => {
      const paymentSummary = getPaymentSummary(student.studentPayments);

      return {
        id: student.id,
        name: student.name,
        phone: student.phone,
        gradeLevel: student.gradeLevel,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        paymentStatus: paymentSummary.status,
        attendanceRate: getAttendanceRate(student.attendanceRecords.map((record) => record.status)),
        amountDue: paymentSummary.amountDue,
        groups: student.enrollments.map((enrollment) => ({
          id: enrollment.group.id,
          name: enrollment.group.name,
        })),
      };
    })
    .filter((student) => (filters.paymentStatus ? student.paymentStatus === filters.paymentStatus : true));
}

export async function getStudentById(tenantId: string, studentId: string, teacherId?: string) {
  const student = await db.user.findFirst({
    where: {
      tenantId,
      id: studentId,
      role: "STUDENT",
      ...(teacherId
        ? {
            enrollments: {
              some: {
                status: {
                  in: ["ACTIVE", "WAITLIST"],
                },
                group: {
                  teacherId,
                },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      gradeLevel: true,
      parentName: true,
      parentPhone: true,
      createdAt: true,
      enrollments: {
        where: {
          status: {
            in: ["ACTIVE", "WAITLIST"],
          },
          ...(teacherId
            ? {
                group: {
                  teacherId,
                },
              }
            : {}),
        },
        select: {
          status: true,
          group: {
            select: {
              id: true,
              name: true,
              subject: true,
              days: true,
              timeStart: true,
              timeEnd: true,
            },
          },
        },
      },
      attendanceRecords: {
        ...(teacherId
          ? {
              where: {
                group: {
                  teacherId,
                },
              },
            }
          : {}),
        orderBy: {
          markedAt: "desc",
        },
        take: 20,
        select: {
          status: true,
          markedAt: true,
          session: {
            select: {
              id: true,
              date: true,
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      studentPayments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
        select: {
          id: true,
          month: true,
          amount: true,
          status: true,
          paidAt: true,
          receiptNumber: true,
        },
      },
    },
  });

  if (!student) {
    return null;
  }

  const paymentSummary = getPaymentSummary(student.studentPayments);

  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    gradeLevel: student.gradeLevel,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    createdAt: student.createdAt,
    paymentStatus: paymentSummary.status,
    amountDue: paymentSummary.amountDue,
    attendanceRate: getAttendanceRate(student.attendanceRecords.map((record) => record.status)),
    groups: student.enrollments.map((enrollment) => ({
      status: enrollment.status,
      group: {
        ...enrollment.group,
        timeStart: formatDisplayTime(enrollment.group.timeStart),
        timeEnd: formatDisplayTime(enrollment.group.timeEnd),
      },
    })),
    attendance: student.attendanceRecords.map((record) => ({
      status: record.status,
      markedAt: record.markedAt,
      session: record.session,
    })),
    payments: student.studentPayments,
  };
}
