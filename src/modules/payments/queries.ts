import { cache } from "react";

import { db } from "@/lib/db";
import { getOrCreateWallet, resolveRechargeWalletOwner, resolveTenantPayeeUserId } from "@/modules/wallet/provider";


function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfPreviousMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function toClientPaymentStatus(status?: string | null) {
  if (status === "PAID" || status === "OVERDUE" || status === "PENDING") {
    return status;
  }

  return status === "PARTIAL" ? "PENDING" : "PENDING";
}

function mapPaymentItem(payment: {
  id: string;
  studentId: string;
  month: string;
  status: string;
  amount: number;
  student: {
    name: string;
  };
}) {
  return {
    id: payment.id,
    studentId: payment.studentId,
    studentName: payment.student.name,
    month: payment.month,
    status: toClientPaymentStatus(payment.status),
    amount: payment.amount,
  };
}

export const getRevenueSummary = cache(async (tenantId: string) => {
  try {
    const currentMonthStart = startOfCurrentMonth();
    const previousMonthStart = startOfPreviousMonth();

    const [paidAllTime, pendingAllTime, overdueAllTime, paidCurrentMonth, paidPreviousMonth] = await Promise.all([
      db.payment.aggregate({
        where: {
          tenantId,
          status: "PAID",
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.aggregate({
        where: {
          tenantId,
          status: "PENDING",
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.aggregate({
        where: {
          tenantId,
          status: "OVERDUE",
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.aggregate({
        where: {
          tenantId,
          status: "PAID",
          createdAt: {
            gte: currentMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.aggregate({
        where: {
          tenantId,
          status: "PAID",
          createdAt: {
            gte: previousMonthStart,
            lt: currentMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const collected = paidAllTime._sum.amount ?? 0;
    const pending = pendingAllTime._sum.amount ?? 0;
    const overdue = overdueAllTime._sum.amount ?? 0;
    const total = collected + pending + overdue;
    const thisMonth = paidCurrentMonth._sum.amount ?? 0;
    const lastMonth = paidPreviousMonth._sum.amount ?? 0;
    const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;
    const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0;

    return {
      collected,
      outstanding: pending + overdue,
      total,
      collectionRate,
      thisMonth,
      lastMonth,
      change,
    };
  } catch (error) {
    console.error("DB getRevenueSummary failed, using mock:", error);
  }

  return { collected: 0, outstanding: 0, total: 0, collectionRate: 0, thisMonth: 0, lastMonth: 0, change: 0 };
});

export const getStudentPaymentSnapshot = cache(async (tenantId: string, studentId: string) => {
  try {
    const payments = await db.payment.findMany({
      where: {
        tenantId,
        studentId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const latest = payments[0];

    return {
      status: latest?.status ?? "PENDING",
      amount: latest?.amount ?? 0,
      payments,
    };
  } catch (error) {
    console.error("DB getStudentPaymentSnapshot failed, using mock:", error);
  }

  return { status: "PENDING", amount: 0, payments: [] };
});

export function resolvePaymentStatus(payments: Array<{ status: string }> = []) {
  if (payments.some((payment) => payment.status === "OVERDUE")) {
    return "OVERDUE" as const;
  }

  if (payments.some((payment) => payment.status === "PARTIAL")) {
    return "PARTIAL" as const;
  }

  if (payments.some((payment) => payment.status === "PAID")) {
    return "PAID" as const;
  }

  return "PENDING" as const;
}

export const getCurrentMonthPaymentStatusMap = cache(async (tenantId: string, studentIds: string[]) => {
  if (studentIds.length === 0) {
    return {} as Record<string, Array<{ id: string; status: string; amount: number; month: string }>>;
  }

  const payments = await db.payment.findMany({
    where: {
      tenantId,
      studentId: {
        in: [...new Set(studentIds)],
      },
      month: currentMonthKey(),
    },
    select: {
      id: true,
      studentId: true,
      status: true,
      amount: true,
      month: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return payments.reduce<Record<string, Array<{ id: string; status: string; amount: number; month: string }>>>((accumulator, payment) => {
    const key = payment.studentId;
    accumulator[key] ??= [];
    accumulator[key].push({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      month: payment.month,
    });
    return accumulator;
  }, {});
});

export const getPayments = cache(async (
  tenantId: string,
  filters: {
    studentId?: string;
    month?: string;
    status?: string;
  } = {},
) => {
  const payments = await db.payment.findMany({
    where: {
      tenantId,
      ...(filters.studentId ? { studentId: filters.studentId } : {}),
      ...(filters.month ? { month: filters.month } : {}),
      ...(filters.status ? { status: filters.status as any } : {}),
    },
    include: {
      student: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return payments.map(mapPaymentItem);
});

export const getPaymentsList = cache(async (tenantId: string) => {
  try {
    const payments = await getPayments(tenantId);
    return payments;
  } catch (error) {
    console.error("DB getPaymentsList failed, using mock:", error);
  }

  return [];
});

export const getOverdueStudents = cache(async (tenantId: string, _teacherId?: string) => {
  return db.payment.findMany({
    where: {
      tenantId,
      status: "OVERDUE",
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          parentPhone: true,
          gradeLevel: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
});

export const getPaymentByKashierOrderId = cache(async (orderId: string) => {
  if (!orderId) {
    return null;
  }

  return db.payment.findFirst({
    where: {
      receiptNumber: orderId,
    },
  });
});

export const getPaymentStudentOptions = cache(async (tenantId: string) => {
  return db.user.findMany({
    where: {
      role: "STUDENT",
      isActive: true,
      groupStudents: {
        some: {
          status: {
            in: ["ACTIVE", "WAITLIST", "PENDING"],
          },
          group: {
            tenantId,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
    },
    orderBy: {
      name: "asc",
    },
  });
});

export const getStudentWallet = cache(async (tenantId: string, studentId: string) => {
  const owner = await resolveRechargeWalletOwner(studentId, tenantId)
  const wallet = await getOrCreateWallet(tenantId, owner.ownerUserId)

  return {
    ownerType: owner.ownerType,
    ownerId: owner.ownerUserId,
    balance: wallet.balance,
    updatedAt: wallet.updatedAt,
  }
})

export const getTeacherTransfers = cache(async (tenantId: string, limit: number = 50) => {
  return db.teacherTransfer.findMany({
    where: { tenantId },
    include: {
      payment: {
        select: {
          id: true,
          amount: true,
          studentId: true,
          month: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
})

export const getTeacherWalletPageData = cache(async (tenantId: string) => {
  const teacherUserId = await resolveTenantPayeeUserId(tenantId)
  const wallet = await getOrCreateWallet(tenantId, teacherUserId)

  const [creditAggregate, payoutAggregate, transactions, withdrawals, subscription, adminUser] = await Promise.all([
    db.walletTransaction.aggregate({
      where: {
        tenantId,
        walletId: wallet.id,
        type: 'CREDIT',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    }),
    db.walletTransaction.aggregate({
      where: {
        tenantId,
        walletId: wallet.id,
        type: 'PAYOUT',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    }),
    db.walletTransaction.findMany({
      where: { tenantId, walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.walletWithdrawal.findMany({
      where: { tenantId, walletId: wallet.id },
      orderBy: { requestedAt: 'desc' },
      take: 20,
    }),
    db.teacherSubscription.findUnique({
      where: { tenantId },
      select: { kashierApiKey: true, kashierMerId: true },
    }),
    db.user.findFirst({
      where: { role: 'SUPER_ADMIN', isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { name: true, phone: true },
    }),
  ])

  return {
    wallet: {
      id: wallet.id,
      balance: wallet.balance,
      updatedAt: wallet.updatedAt.toISOString(),
    },
    totals: {
      received: creditAggregate._sum.amount ?? 0,
      withdrawn: payoutAggregate._sum.amount ?? 0,
    },
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      reason: transaction.reason,
      status: transaction.status,
      createdAt: transaction.createdAt.toISOString(),
    })),
    withdrawals: withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      amount: withdrawal.amount,
      method: withdrawal.method,
      adminMethod: withdrawal.adminMethod,
      status: withdrawal.status,
      failureReason: withdrawal.failureReason,
      requestedAt: withdrawal.requestedAt.toISOString(),
      processedAt: withdrawal.processedAt?.toISOString() ?? null,
    })),
    kashierApiConfigured: !!(subscription?.kashierApiKey && subscription.kashierMerId),
    adminContact: adminUser ? { name: adminUser.name, phone: adminUser.phone } : null,
  }
})

