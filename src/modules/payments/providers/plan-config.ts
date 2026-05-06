import { Prisma, type SubscriptionPlan } from "@/generated/client";

import { db } from "@/lib/db";

export type SubscriptionPlanType = string;

export type PlanConfig = {
  key: string;
  legacyPlan: SubscriptionPlan | null;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  limits: {
    students: number;
    groups: number;
    sessions: number;
    storage: number;
  };
  isActive: boolean;
  deletedAt: Date | null;
};

export const DEFAULT_SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  STARTER: {
    key: "STARTER",
    legacyPlan: "STARTER",
    name: "البداية",
    monthlyPrice: 200,
    yearlyPrice: 2000,
    limits: { students: 20, groups: 2, sessions: 100, storage: 100 },
    isActive: true,
    deletedAt: null,
  },
  PROFESSIONAL: {
    key: "PROFESSIONAL",
    legacyPlan: "PROFESSIONAL",
    name: "الاحترافية",
    monthlyPrice: 500,
    yearlyPrice: 5000,
    limits: { students: 100, groups: 10, sessions: 1000, storage: 1000 },
    isActive: true,
    deletedAt: null,
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    legacyPlan: "ENTERPRISE",
    name: "المؤسسات",
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: {
      students: Number.MAX_SAFE_INTEGER,
      groups: Number.MAX_SAFE_INTEGER,
      sessions: Number.MAX_SAFE_INTEGER,
      storage: Number.MAX_SAFE_INTEGER,
    },
    isActive: true,
    deletedAt: null,
  },
};

const LEGACY_PLAN_KEYS = new Set(["STARTER", "PROFESSIONAL", "ENTERPRISE"]);

function normalizeLimit(value: number) {
  if (!Number.isFinite(value) || value <= 0) return Number.MAX_SAFE_INTEGER;
  return Math.trunc(value);
}

function toStoredLimit(value: number) {
  return Math.max(0, Math.trunc(value));
}

export function normalizePlanKey(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function generatePlanKeyFromName(name: string) {
  const fallbackBase = "PLAN";
  const normalizedName = normalizePlanKey(name);
  const baseKey = normalizedName || fallbackBase;

  let candidate = baseKey;
  let suffix = 2;

  while (await db.subscriptionPlanConfig.findUnique({ where: { key: candidate }, select: { key: true } })) {
    const suffixText = `_${suffix}`;
    const maxBaseLength = 40 - suffixText.length;
    candidate = `${baseKey.slice(0, maxBaseLength)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

function mapRow(row: {
  key: string | null;
  plan: SubscriptionPlan | null;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  studentsLimit: number;
  groupsLimit: number;
  sessionsLimit: number;
  storageLimit: number;
  isActive: boolean;
  deletedAt?: Date | null;
}): PlanConfig {
  const key = row.key || row.plan || "STARTER";

  return {
    key,
    legacyPlan: row.plan,
    name: row.name,
    monthlyPrice: row.monthlyPrice,
    yearlyPrice: row.yearlyPrice,
    limits: {
      students: normalizeLimit(row.studentsLimit),
      groups: normalizeLimit(row.groupsLimit),
      sessions: normalizeLimit(row.sessionsLimit),
      storage: normalizeLimit(row.storageLimit),
    },
    isActive: row.isActive,
    deletedAt: row.deletedAt ?? null,
  };
}

export async function getSubscriptionPlanConfigs(options: { includeDeleted?: boolean } = {}): Promise<Record<string, PlanConfig>> {
  const merged: Record<string, PlanConfig> = {
    STARTER: { ...DEFAULT_SUBSCRIPTION_PLANS.STARTER },
    PROFESSIONAL: { ...DEFAULT_SUBSCRIPTION_PLANS.PROFESSIONAL },
    ENTERPRISE: { ...DEFAULT_SUBSCRIPTION_PLANS.ENTERPRISE },
  };

  try {
    const rows = await db.subscriptionPlanConfig.findMany({
      where: options.includeDeleted ? undefined : { deletedAt: null },
      select: {
        key: true,
        plan: true,
        name: true,
        monthlyPrice: true,
        yearlyPrice: true,
        studentsLimit: true,
        groupsLimit: true,
        sessionsLimit: true,
        storageLimit: true,
        isActive: true,
        deletedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    for (const row of rows) {
      const plan = mapRow(row);
      merged[plan.key] = plan;
    }

    return options.includeDeleted
      ? merged
      : Object.fromEntries(Object.entries(merged).filter(([, plan]) => !plan.deletedAt));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") return merged;
    throw error;
  }
}

export async function getSubscriptionPlanConfig(planKey: SubscriptionPlanType): Promise<PlanConfig> {
  const configs = await getSubscriptionPlanConfigs({ includeDeleted: true });
  const config = configs[planKey];
  if (!config || config.deletedAt) throw new Error("الباقة غير موجودة");
  return config;
}

export async function upsertSubscriptionPlanConfig(input: {
  key: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  studentsLimit: number;
  groupsLimit: number;
  sessionsLimit: number;
  storageLimit: number;
  isActive: boolean;
}) {
  const key = normalizePlanKey(input.key);
  if (!key) throw new Error("مفتاح الباقة مطلوب");

  const legacyPlan = LEGACY_PLAN_KEYS.has(key) ? (key as SubscriptionPlan) : null;

  try {
    return db.subscriptionPlanConfig.upsert({
      where: { key },
      create: {
        key,
        plan: legacyPlan,
        name: input.name,
        monthlyPrice: Math.max(0, Math.trunc(input.monthlyPrice)),
        yearlyPrice: Math.max(0, Math.trunc(input.yearlyPrice)),
        studentsLimit: toStoredLimit(input.studentsLimit),
        groupsLimit: toStoredLimit(input.groupsLimit),
        sessionsLimit: toStoredLimit(input.sessionsLimit),
        storageLimit: toStoredLimit(input.storageLimit),
        isActive: input.isActive,
        deletedAt: null,
      },
      update: {
        name: input.name,
        monthlyPrice: Math.max(0, Math.trunc(input.monthlyPrice)),
        yearlyPrice: Math.max(0, Math.trunc(input.yearlyPrice)),
        studentsLimit: toStoredLimit(input.studentsLimit),
        groupsLimit: toStoredLimit(input.groupsLimit),
        sessionsLimit: toStoredLimit(input.sessionsLimit),
        storageLimit: toStoredLimit(input.storageLimit),
        isActive: input.isActive,
        deletedAt: null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      throw new Error("جدول إعدادات الباقات غير موجود في قاعدة البيانات. نفّذ prisma db push أولاً.");
    }
    throw error;
  }
}

export async function updateSubscriptionPlanConfig(input: {
  originalKey: string;
  nextKey: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  studentsLimit: number;
  groupsLimit: number;
  sessionsLimit: number;
  storageLimit: number;
  isActive: boolean;
}) {
  const originalKey = normalizePlanKey(input.originalKey);
  const nextKey = normalizePlanKey(input.nextKey);

  if (!originalKey || !nextKey) throw new Error("مفتاح الباقة مطلوب");

  const legacyPlan = LEGACY_PLAN_KEYS.has(nextKey) ? (nextKey as SubscriptionPlan) : null;

  try {
    return db.$transaction(async (tx) => {
      if (originalKey !== nextKey) {
        const existing = await tx.subscriptionPlanConfig.findUnique({
          where: { key: nextKey },
          select: { key: true },
        });

        if (existing) throw new Error("مفتاح الباقة مستخدم بالفعل");
      }

      const updated = await tx.subscriptionPlanConfig.update({
        where: { key: originalKey },
        data: {
          key: nextKey,
          plan: legacyPlan,
          name: input.name,
          monthlyPrice: Math.max(0, Math.trunc(input.monthlyPrice)),
          yearlyPrice: Math.max(0, Math.trunc(input.yearlyPrice)),
          studentsLimit: toStoredLimit(input.studentsLimit),
          groupsLimit: toStoredLimit(input.groupsLimit),
          sessionsLimit: toStoredLimit(input.sessionsLimit),
          storageLimit: toStoredLimit(input.storageLimit),
          isActive: input.isActive,
          deletedAt: null,
        },
      });

      if (originalKey !== nextKey) {
        await tx.teacherSubscription.updateMany({
          where: { planKey: originalKey },
          data: {
            planKey: nextKey,
            subscriptionPlan: legacyPlan ?? "STARTER",
          },
        });
      }

      return updated;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      throw new Error("جدول إعدادات الباقات غير موجود في قاعدة البيانات. نفّذ prisma db push أولاً.");
    }
    throw error;
  }
}

export async function softDeleteSubscriptionPlanConfig(key: string) {
  const normalizedKey = normalizePlanKey(key);
  if (!normalizedKey) throw new Error("مفتاح الباقة مطلوب");

  const inUse = await db.teacherSubscription.count({ where: { planKey: normalizedKey } });
  if (inUse > 0) {
    return db.subscriptionPlanConfig.update({
      where: { key: normalizedKey },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  return db.subscriptionPlanConfig.delete({ where: { key: normalizedKey } });
}
