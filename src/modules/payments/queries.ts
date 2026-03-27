import { cache } from "react";
import { PaymentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type PaymentSnapshotStatus = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addMonths(date: Date, offset: number) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + offset);
  return value;
}

function isCollectedStatus(status: PaymentSnapshotStatus) {
  return status === "PAID" || status === "PARTIAL";
}

function buildTeacherStudentFilter(teacherId?: string): Prisma.PaymentWhereInput {
  if (!teacherId) {
    return {};
  }

  return {
    student: {
      is: {
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
      },
    },
  };
}

export function resolvePaymentStatus(
  payments: Array<{ status: PaymentSnapshotStatus }> | undefined,
) {
  if (!payments || payments.length === 0) {
    return "PENDING" as const;
  }

  if (payments.some((payment) => payment.status === "OVERDUE")) {
    return "OVERDUE" as const;
  }

  if (payments.some((payment) => payment.status === "PARTIAL")) {
    return "PARTIAL" as const;
  }

  if (payments.some((payment) => payment.status === "PENDING")) {
    return "PENDING" as const;
  }

  return "PAID" as const;
}

export const getRevenueSummary = cache(async (tenantId: string, month?: string, teacherId?: string) => {
  const payments = await db.payment.findMany({
    where: {
      tenantId,
      ...buildTeacherStudentFilter(teacherId),
    },
    select: {
      amount: true,
      status: true,
      createdAt: true,
    },
  });

  const monthMatch = month?.match(/^(\d{4})-(\d{2})$/);
  const thisMonthStart = monthMatch ? new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1) : startOfMonth();
  thisMonthStart.setHours(0, 0, 0, 0);
  const nextMonthStart = addMonths(thisMonthStart, 1);
  const lastMonthStart = addMonths(thisMonthStart, -1);

  const thisMonth = payments
    .filter((payment) => payment.createdAt >= thisMonthStart && payment.createdAt < nextMonthStart && isCollectedStatus(payment.status))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const lastMonth = payments
    .filter((payment) => payment.createdAt >= lastMonthStart && payment.createdAt < thisMonthStart && isCollectedStatus(payment.status))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const outstandingPayments = payments.filter((payment) => payment.status !== "PAID");
  const change = lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  return {
    thisMonth,
    lastMonth,
    change,
    outstanding: {
      total: outstandingPayments.reduce((sum, payment) => sum + payment.amount, 0),
      count: outstandingPayments.length,
    },
  };
});

export const getStudentPaymentSnapshot = cache(async (tenantId: string, studentId: string) => {
  const payment = await db.payment.findFirst({
    where: {
      tenantId,
      studentId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      amount: true,
      status: true,
    },
  });

  if (!payment) {
    return {
      amount: 0,
      status: "PAID" as const,
    };
  }

  return payment;
});

export const getPaymentsList = cache(async (tenantId: string, teacherId?: string) => {
  const payments = await db.payment.findMany({
    where: {
      tenantId,
      ...buildTeacherStudentFilter(teacherId),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      studentId: true,
      month: true,
      status: true,
      amount: true,
      student: {
        select: {
          name: true,
        },
      },
    },
  });

  return payments.map((payment) => ({
    id: payment.id,
    studentId: payment.studentId,
    studentName: payment.student.name,
    month: payment.month,
    status: payment.status,
    amount: payment.amount,
  }));
});

export const getPaymentStudentOptions = cache(async (tenantId: string, teacherId?: string) => {
  const students = await db.user.findMany({
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
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  return students;
});

export const getRevenueSeries = cache(async (tenantId: string, teacherId?: string) => {
  const payments = await db.payment.findMany({
    where: {
      tenantId,
      ...buildTeacherStudentFilter(teacherId),
    },
    select: {
      amount: true,
      status: true,
      createdAt: true,
    },
  });

  const formatter = new Intl.DateTimeFormat("ar-EG", { month: "long" });
  const currentMonthStart = startOfMonth();

  return Array.from({ length: 6 }, (_, index) => {
    const monthStart = addMonths(currentMonthStart, index - 5);
    const nextMonth = addMonths(monthStart, 1);
    const revenue = payments
      .filter((payment) => payment.createdAt >= monthStart && payment.createdAt < nextMonth && isCollectedStatus(payment.status))
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      month: formatter.format(monthStart),
      revenue,
    };
  });
});

export const getOverduePayments = cache(async (tenantId: string, take = 4, teacherId?: string) => {
  const payments = await db.payment.findMany({
    where: {
      tenantId,
      ...buildTeacherStudentFilter(teacherId),
      status: {
        in: ["OVERDUE", "PENDING", "PARTIAL"],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take,
    select: {
      id: true,
      amount: true,
      status: true,
      student: {
        select: {
          name: true,
        },
      },
    },
  });

  return payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    studentName: payment.student.name,
  }));
});

export const getPayments = cache(
  async (
    tenantId: string,
    filters: {
      studentId?: string;
      month?: string;
      status?: string;
    } = {},
  ) => {
    const status =
      filters.status && Object.values(PaymentStatus).includes(filters.status as PaymentStatus)
        ? (filters.status as PaymentStatus)
        : undefined;

    const payments = await db.payment.findMany({
      where: {
        tenantId,
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.month ? { month: filters.month } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        studentId: true,
        month: true,
        status: true,
        amount: true,
        method: true,
        receiptNumber: true,
        paidAt: true,
        student: {
          select: {
            name: true,
          },
        },
      },
    });

    return payments.map((payment) => ({
      id: payment.id,
      studentId: payment.studentId,
      studentName: payment.student.name,
      month: payment.month,
      status: payment.status,
      amount: payment.amount,
      method: payment.method,
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt,
    }));
  },
);

export const getPaymentByKashierOrderId = cache(async (orderId: string) => {
  return db.payment.findUnique({
    where: {
      receiptNumber: orderId,
    },
  });
});

export const getCurrentMonthPaymentStatusMap = cache(async (tenantId: string, studentIds: string[]) => {
  const uniqueStudentIds = [...new Set(studentIds)].filter(Boolean);

  if (uniqueStudentIds.length === 0) {
    return {} as Record<string, Array<{ status: PaymentSnapshotStatus; amount: number }>>;
  }

  const month = new Date().toISOString().slice(0, 7);
  const payments = await db.payment.findMany({
    where: {
      tenantId,
      month,
      studentId: {
        in: uniqueStudentIds,
      },
    },
    select: {
      studentId: true,
      status: true,
      amount: true,
    },
  });

  return payments.reduce<Record<string, Array<{ status: PaymentSnapshotStatus; amount: number }>>>((accumulator, payment) => {
    accumulator[payment.studentId] ??= [];
    accumulator[payment.studentId].push({
      status: payment.status,
      amount: payment.amount,
    });
    return accumulator;
  }, {});
});

export const getOverdueStudents = cache(async (tenantId: string, teacherId?: string) => {
  return db.payment.findMany({
    where: {
      tenantId,
      ...buildTeacherStudentFilter(teacherId),
      status: {
        in: ["OVERDUE", "PENDING", "PARTIAL"],
      },
    },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      amount: true,
      month: true,
      status: true,
      student: {
        select: {
          id: true,
          name: true,
          parentPhone: true,
          gradeLevel: true,
        },
      },
    },
  });
});
