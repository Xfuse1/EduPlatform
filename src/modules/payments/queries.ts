import { cache } from "react";

import { db } from "@/lib/db";

const currentMonth = new Date().toISOString().slice(0, 7);
const previousMonthDate = new Date();
previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
const previousMonth = previousMonthDate.toISOString().slice(0, 7);

export const getRevenueSummary = cache(async (tenantId: string) => {
  const [currentPayments, previousPayments, overduePayments] = await Promise.all([
    db.payment.findMany({
      where: { tenantId, month: currentMonth, status: "PAID" },
      select: { amount: true },
    }),
    db.payment.findMany({
      where: { tenantId, month: previousMonth, status: "PAID" },
      select: { amount: true },
    }),
    db.payment.findMany({
      where: {
        tenantId,
        month: currentMonth,
        status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
      },
      select: { amount: true, studentId: true },
    }),
  ]);

  const thisMonth = currentPayments.reduce((total, payment) => total + payment.amount, 0);
  const lastMonth = previousPayments.reduce((total, payment) => total + payment.amount, 0);
  const outstandingTotal = overduePayments.reduce((total, payment) => total + payment.amount, 0);

  return {
    thisMonth,
    lastMonth,
    change: lastMonth === 0 ? 100 : Math.round(((thisMonth - lastMonth) / lastMonth) * 100),
    outstanding: {
      total: outstandingTotal,
      count: new Set(overduePayments.map((payment) => payment.studentId)).size,
    },
  };
});

export const getStudentPaymentSnapshot = cache(async (tenantId: string, studentId: string) => {
  const payment = await db.payment.findFirst({
    where: { tenantId, studentId, month: currentMonth },
    orderBy: { createdAt: "desc" },
    select: { amount: true, status: true },
  });

  return {
    status: payment?.status ?? "PENDING",
    amount: payment?.amount ?? 0,
  };
});
