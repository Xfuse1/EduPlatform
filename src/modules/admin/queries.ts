import { cache } from "react";
import type { UserRole } from "@/generated/client";

import { db } from "@/lib/db";

export const getPlatformOverview = cache(async () => {
  const tenantWhere = {
    users: {
      none: {
        role: "SUPER_ADMIN" as const,
      },
    },
  };
  const userWhere = {
    role: {
      not: "SUPER_ADMIN" as const,
    },
    tenant: tenantWhere,
  };

  const [
    tenantsTotal,
    tenantsActive,
    usersTotal,
    paymentsTotal,
    revenueAggregate,
    activeSubscriptions,
    pendingTransfers,
    failedTransfers,
  ] = await Promise.all([
    db.tenant.count({ where: tenantWhere }),
    db.tenant.count({ where: { ...tenantWhere, isActive: true } }),
    db.user.count({ where: userWhere }),
    db.payment.count(),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    db.teacherSubscription.count({ where: { isActive: true } }),
    db.teacherTransfer.count({ where: { status: { in: ["PENDING", "RETRY"] } } }),
    db.teacherTransfer.count({ where: { status: "FAILED" } }),
  ]);

  return {
    tenantsTotal,
    tenantsActive,
    usersTotal,
    paymentsTotal,
    totalRevenue: revenueAggregate._sum.amount ?? 0,
    activeSubscriptions,
    pendingTransfers,
    failedTransfers,
  };
});

export async function getPlatformTenants(input?: {
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  limit?: number;
  offset?: number;
}) {
  const search = input?.search?.trim();
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);

  const where = {
    users: {
      none: {
        role: "SUPER_ADMIN" as const,
      },
    },
    ...(input?.status === "ACTIVE"
      ? { isActive: true }
      : input?.status === "INACTIVE"
        ? { isActive: false }
        : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.tenant.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        isActive: true,
        plan: true,
        createdAt: true,
        teacherSubscription: {
          select: {
            isActive: true,
            subscriptionPlan: true,
            billingCycle: true,
            nextBillingAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            groups: true,
            payments: true,
          },
        },
      },
    }),
    db.tenant.count({ where }),
  ]);

  return { items, total, limit, offset };
}

export async function getPlatformUsers(input?: {
  search?: string;
  role?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}) {
  const search = input?.search?.trim();
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);
  const validRoles: UserRole[] = [
    "SUPER_ADMIN",
    "CENTER_ADMIN",
    "ADMIN",
    "MANAGER",
    "TEACHER",
    "STUDENT",
    "PARENT",
    "ASSISTANT",
  ];
  const roleFilter =
    input?.role && validRoles.includes(input.role as UserRole)
      ? (input.role as UserRole)
      : undefined;

  if (roleFilter === "SUPER_ADMIN") {
    return { items: [], total: 0, limit, offset };
  }

  const where = {
    role: {
      not: "SUPER_ADMIN" as const,
    },
    tenant: {
      users: {
        none: {
          role: "SUPER_ADMIN" as const,
        },
      },
    },
    ...(input?.tenantId ? { tenantId: input.tenantId } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tenantId: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        tenant: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return { items, total, limit, offset };
}

export async function getPlatformSubscriptions(input?: { status?: "ACTIVE" | "INACTIVE"; limit?: number; offset?: number }) {
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);

  const where =
    input?.status === "ACTIVE"
      ? { isActive: true }
      : input?.status === "INACTIVE"
        ? { isActive: false }
        : {};

  const [items, total] = await Promise.all([
    db.teacherSubscription.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        tenantId: true,
        subscriptionPlan: true,
        billingCycle: true,
        amount: true,
        isActive: true,
        nextBillingAt: true,
        updatedAt: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    db.teacherSubscription.count({ where }),
  ]);

  return { items, total, limit, offset };
}

export async function getPlatformPayments(input?: { status?: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL"; limit?: number; offset?: number }) {
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);

  const where = input?.status ? { status: input.status } : {};

  const [items, total] = await Promise.all([
    db.payment.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        month: true,
        paymentGateway: true,
        createdAt: true,
        paidAt: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
        student: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    }),
    db.payment.count({ where }),
  ]);

  return { items, total, limit, offset };
}

export async function getPlatformTransfers(input?: { status?: "PENDING" | "SUCCESS" | "FAILED" | "RETRY"; limit?: number; offset?: number }) {
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);

  const where = input?.status ? { status: input.status } : {};

  const [items, total] = await Promise.all([
    db.teacherTransfer.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        fee: true,
        status: true,
        attemptCount: true,
        failureReason: true,
        createdAt: true,
        paymentId: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    db.teacherTransfer.count({ where }),
  ]);

  return { items, total, limit, offset };
}

export async function getPlatformWallets(input?: {
  search?: string;
  role?: string;
  balance?: "POSITIVE" | "ZERO";
  limit?: number;
  offset?: number;
}) {
  const search = input?.search?.trim();
  const limit = Math.min(Math.max(input?.limit ?? 30, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);
  const validRoles: UserRole[] = [
    "SUPER_ADMIN",
    "CENTER_ADMIN",
    "ADMIN",
    "MANAGER",
    "TEACHER",
    "STUDENT",
    "PARENT",
    "ASSISTANT",
  ];
  const roleFilter =
    input?.role && validRoles.includes(input.role as UserRole)
      ? (input.role as UserRole)
      : undefined;

  const where = {
    AND: [
      ...(roleFilter ? [{ role: roleFilter }] : []),
      ...(search
        ? [
            {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { phone: { contains: search, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
      ...(input?.balance === "POSITIVE"
        ? [{ userWallets: { some: { balance: { gt: 0 } } } }]
        : input?.balance === "ZERO"
          ? [
              {
                OR: [
                  { userWallets: { none: {} } },
                  { userWallets: { some: { balance: 0 } } },
                ],
              },
            ]
          : []),
    ],
  };

  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        tenantId: true,
        name: true,
        phone: true,
        role: true,
        updatedAt: true,
        tenant: {
          select: { name: true, slug: true },
        },
        userWallets: {
          select: { id: true, balance: true, updatedAt: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return {
    items: items.map((user) => {
      const wallet = user.userWallets.find((item) => item.id) ?? null;
      return {
        id: wallet?.id ?? `wallet-${user.id}`,
        tenantId: user.tenantId,
        userId: user.id,
        balance: wallet?.balance ?? 0,
        updatedAt: wallet?.updatedAt ?? user.updatedAt,
        tenant: user.tenant,
        user: {
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      };
    }),
    total,
    limit,
    offset,
  };
}

export async function getPlatformWalletWithdrawals(input?: {
  status?: "PENDING" | "SUCCESS" | "FAILED";
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);
  const where = input?.status ? { status: input.status } : {};

  const [items, total] = await Promise.all([
    db.walletWithdrawal.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        amount: true,
        method: true,
        adminMethod: true,
        status: true,
        failureReason: true,
        requestedAt: true,
        processedAt: true,
        processedBy: {
          select: { name: true, phone: true },
        },
        tenant: {
          select: { name: true, slug: true },
        },
        user: {
          select: { name: true, phone: true, role: true },
        },
      },
    }),
    db.walletWithdrawal.count({ where }),
  ]);

  return { items, total, limit, offset };
}
