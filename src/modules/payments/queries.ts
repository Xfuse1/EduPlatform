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

function toClientPaymentStatus(status?: string | null): "PAID" | "OVERDUE" | "PENDING" {
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
      NOT: { notes: { startsWith: 'SUBSCRIPTION:' } },
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

function getWalletTransactionDirection(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || !('direction' in metadata)) {
    return null
  }

  const direction = metadata.direction
  return direction === 'CREDIT' || direction === 'DEBIT' ? direction : null
}

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
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            month: true,
            method: true,
            status: true,
            notes: true,
            receiptNumber: true,
            transactionId: true,
            paymentGateway: true,
            paidAt: true,
            student: { select: { name: true } },
          },
        },
        withdrawal: {
          select: {
            id: true,
            amount: true,
            method: true,
            adminMethod: true,
            status: true,
            requestedAt: true,
            processedAt: true,
          },
        },
      },
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

  const transactionIds = transactions.map((transaction) => transaction.id)
  const groupCharges = transactionIds.length > 0
    ? await db.groupBillingCharge.findMany({
        where: {
          tenantId,
          walletCreditTxId: { in: transactionIds },
          relatedSessionId: { not: null },
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const groupIds = [...new Set(groupCharges.map((charge) => charge.groupId))]
  const sessionIds = [...new Set(groupCharges.map((charge) => charge.relatedSessionId).filter(Boolean))] as string[]
  const studentIds = [...new Set(groupCharges.map((charge) => charge.studentId))]

  const [groups, sessions, students, attendances] = await Promise.all([
    groupIds.length > 0
      ? db.group.findMany({
          where: { tenantId, id: { in: groupIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    sessionIds.length > 0
      ? db.session.findMany({
          where: { tenantId, id: { in: sessionIds } },
          select: { id: true, groupId: true, date: true },
        })
      : Promise.resolve([]),
    studentIds.length > 0
      ? db.user.findMany({
          where: { tenantId, id: { in: studentIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    sessionIds.length > 0 && studentIds.length > 0
      ? db.attendance.findMany({
          where: {
            tenantId,
            sessionId: { in: sessionIds },
            studentId: { in: studentIds },
          },
          select: {
            sessionId: true,
            studentId: true,
            status: true,
            method: true,
            markedAt: true,
          },
        })
      : Promise.resolve([]),
  ])

  const groupsById = new Map(groups.map((group) => [group.id, group]))
  const sessionsById = new Map(sessions.map((session) => [session.id, session]))
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const attendanceBySessionStudent = new Map(
    attendances.map((attendance) => [`${attendance.sessionId}:${attendance.studentId}`, attendance]),
  )
  const chargesBySessionGroup = new Map<string, typeof groupCharges>()

  for (const charge of groupCharges) {
    if (!charge.relatedSessionId) continue
    const key = `${charge.relatedSessionId}:${charge.groupId}`
    const charges = chargesBySessionGroup.get(key) ?? []
    charges.push(charge)
    chargesBySessionGroup.set(key, charges)
  }

  const groupedCreditTransactionIds = new Set(
    groupCharges.map((charge) => charge.walletCreditTxId).filter(Boolean) as string[],
  )

  const groupedActivityItems = [...chargesBySessionGroup.entries()].map(([key, charges]) => {
    const [sessionId, groupId] = key.split(':')
    const session = sessionsById.get(sessionId)
    const group = groupsById.get(groupId)
    const latestCreatedAt = charges.reduce(
      (latest, charge) => (charge.createdAt > latest ? charge.createdAt : latest),
      charges[0]?.createdAt ?? new Date(0),
    )
    const totalAmount = charges.reduce((sum, charge) => sum + charge.amount, 0)
    const sessionDate = session?.date ?? latestCreatedAt

    return {
      kind: 'GROUP_SESSION' as const,
      id: `group-session:${sessionId}:${groupId}`,
      title: group?.name ?? 'مجموعة غير معروفة',
      groupName: group?.name ?? 'مجموعة غير معروفة',
      sessionDate: sessionDate.toISOString(),
      createdAt: latestCreatedAt.toISOString(),
      sortAt: latestCreatedAt.toISOString(),
      amount: totalAmount,
      type: 'CREDIT' as const,
      status: 'COMPLETED' as const,
      studentCount: charges.length,
      details: charges.map((charge) => {
        const attendance = charge.relatedSessionId
          ? attendanceBySessionStudent.get(`${charge.relatedSessionId}:${charge.studentId}`)
          : null

        return {
          id: charge.id,
          studentName: studentsById.get(charge.studentId)?.name ?? 'طالب غير معروف',
          amount: charge.amount,
          attendanceMethod: attendance?.method ?? null,
          attendanceStatus: attendance?.status ?? null,
          markedAt: attendance?.markedAt?.toISOString() ?? null,
        }
      }),
    }
  })

  const transactionActivityItems = transactions
    .filter((transaction) => !groupedCreditTransactionIds.has(transaction.id))
    .map((transaction) => {
      const direction = getWalletTransactionDirection(transaction.metadata)

      return {
        kind: 'TRANSACTION' as const,
        id: transaction.id,
        title: transaction.reason,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        direction,
        createdAt: transaction.createdAt.toISOString(),
        sortAt: transaction.createdAt.toISOString(),
        reason: transaction.reason,
        metadata: transaction.metadata,
        payment: transaction.payment
          ? {
              id: transaction.payment.id,
              amount: transaction.payment.amount,
              month: transaction.payment.month,
              method: transaction.payment.method,
              status: transaction.payment.status,
              notes: transaction.payment.notes,
              receiptNumber: transaction.payment.receiptNumber,
              transactionId: transaction.payment.transactionId,
              paymentGateway: transaction.payment.paymentGateway,
              paidAt: transaction.payment.paidAt?.toISOString() ?? null,
              studentName: transaction.payment.student.name,
            }
          : null,
        withdrawal: transaction.withdrawal
          ? {
              id: transaction.withdrawal.id,
              amount: transaction.withdrawal.amount,
              method: transaction.withdrawal.method,
              adminMethod: transaction.withdrawal.adminMethod,
              status: transaction.withdrawal.status,
              requestedAt: transaction.withdrawal.requestedAt.toISOString(),
              processedAt: transaction.withdrawal.processedAt?.toISOString() ?? null,
            }
          : null,
      }
    })

  const activityItems = [...groupedActivityItems, ...transactionActivityItems]
    .sort((first, second) => new Date(second.sortAt).getTime() - new Date(first.sortAt).getTime())
    .slice(0, 20)

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
    activityItems,
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      reason: transaction.reason,
      status: transaction.status,
      metadata: transaction.metadata,
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

