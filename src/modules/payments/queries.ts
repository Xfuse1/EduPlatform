import { cache } from "react";

import { db } from "@/lib/db";
import { MOCK_PAYMENT_SNAPSHOT, MOCK_PAYMENTS, MOCK_REVENUE_SUMMARY } from "@/lib/mock-data";

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfPreviousMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
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

  return {
    collected: MOCK_REVENUE_SUMMARY.thisMonth,
    outstanding: MOCK_REVENUE_SUMMARY.outstanding.total,
    total: MOCK_REVENUE_SUMMARY.thisMonth + MOCK_REVENUE_SUMMARY.outstanding.total,
    collectionRate: 0,
    thisMonth: MOCK_REVENUE_SUMMARY.thisMonth,
    lastMonth: MOCK_REVENUE_SUMMARY.lastMonth,
    change: MOCK_REVENUE_SUMMARY.change,
  };
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

  return MOCK_PAYMENT_SNAPSHOT;
});

export const getPaymentsList = cache(async (tenantId: string) => {
  try {
    const payments = await db.payment.findMany({
      where: {
        tenantId,
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

    return payments
      .filter((payment) => payment.status === "PAID" || payment.status === "OVERDUE" || payment.status === "PENDING")
      .map((payment) => ({
        id: payment.id,
        studentName: payment.student.name,
        month: payment.month,
        status: payment.status === "PAID" || payment.status === "OVERDUE" || payment.status === "PENDING" ? payment.status : "PENDING",
        amount: payment.amount,
      }));
  } catch (error) {
    console.error("DB getPaymentsList failed, using mock:", error);
  }

  return MOCK_PAYMENTS;
});
