import { cache } from "react";

import { db } from "@/lib/db";
import { MOCK_PARENT_CHILDREN, MOCK_STUDENT_COUNT_SUMMARY, MOCK_STUDENT_PROFILE, MOCK_STUDENTS } from "@/lib/mock-data";

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
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

  return {
    total: MOCK_STUDENT_COUNT_SUMMARY.total,
    newThisMonth: MOCK_STUDENT_COUNT_SUMMARY.recent,
    recent: MOCK_STUDENT_COUNT_SUMMARY.recent,
  };
});

export const getStudentProfile = cache(async (tenantId: string, studentId: string) => {
  try {
    const student = await db.user.findFirst({
      where: {
        id: studentId,
        tenantId,
        role: "STUDENT",
      },
      include: {
        groupStudents: {
          where: {
            status: "ACTIVE",
          },
          include: {
            group: true,
          },
        },
      },
    });

    if (student) {
      return {
        id: student.id,
        name: student.name,
        gradeLevel: student.gradeLevel,
        enrollments: student.groupStudents.map((enrollment) => ({
          group: {
            id: enrollment.group.id,
            name: enrollment.group.name,
            timeStart: enrollment.group.timeStart,
            timeEnd: enrollment.group.timeEnd,
            days: enrollment.group.days,
          },
        })),
      };
    }
  } catch (error) {
    console.error("DB getStudentProfile failed, using mock:", error);
  }

  return MOCK_STUDENT_PROFILE;
});

export const getParentChildren = cache(async (tenantId: string, parentId: string) => {
  try {
    const children = await db.parentStudent.findMany({
      where: {
        parentId,
        parent: {
          tenantId,
        },
        student: {
          tenantId,
        },
      },
      include: {
        student: {
          include: {
            groupStudents: {
              where: {
                status: "ACTIVE",
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

  return MOCK_PARENT_CHILDREN;
});

export const getStudentsList = cache(async (tenantId: string) => {
  try {
    const students = await db.user.findMany({
      where: {
        tenantId,
        role: "STUDENT",
      },
      include: {
        groupStudents: {
          where: {
            status: "ACTIVE",
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        childStudents: {
          include: {
            parent: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
        attendances: {
          where: {
            tenantId,
          },
          select: {
            status: true,
          },
        },
        payments: {
          where: {
            tenantId,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            status: true,
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return students.map((student) => {
      const attendanceCount = student.attendances.length;
      const attendedCount = student.attendances.filter(
        (record) => record.status === "PRESENT" || record.status === "LATE",
      ).length;
      const latestPayment = student.payments[0];
      const parentLink = student.childStudents[0];
      const activeGroup = student.groupStudents[0];

      return {
        id: student.id,
        name: student.name,
        studentPhone: student.phone.startsWith("student-") ? "" : student.phone,
        parentName: parentLink?.parent.name ?? student.parentName ?? "",
        parentPhone: parentLink?.parent.phone ?? student.parentPhone ?? "",
        grade: student.gradeLevel ?? "غير محدد",
        gradeLevel: student.gradeLevel ?? "",
        group: student.groupStudents.map((enrollment) => enrollment.group.name).join(" - ") || "غير محدد",
        groupId: activeGroup?.group.id ?? "",
        paymentStatus: latestPayment?.status === "PARTIAL" ? "PENDING" : latestPayment?.status ?? "PENDING",
        attendance: attendanceCount > 0 ? Math.round((attendedCount / attendanceCount) * 100) : 0,
        amountDue: latestPayment && latestPayment.status !== "PAID" ? latestPayment.amount : 0,
      };
    });
  } catch (error) {
    console.error("DB getStudentsList failed, using mock:", error);
  }

  return MOCK_STUDENTS.map((student) => ({
    ...student,
    studentPhone: "",
    parentName: "",
    parentPhone: "",
    gradeLevel: student.grade,
    groupId: "",
  }));
});
