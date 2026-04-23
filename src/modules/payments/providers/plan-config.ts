import { Prisma, type SubscriptionPlan } from '@/generated/client'

import { db } from '@/lib/db'

export type SubscriptionPlanType = SubscriptionPlan

export type PlanConfig = {
  key: SubscriptionPlanType
  name: string
  monthlyPrice: number
  yearlyPrice: number
  limits: {
    students: number
    groups: number
    sessions: number
    storage: number
  }
  isActive: boolean
}

export const DEFAULT_SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, PlanConfig> = {
  STARTER: {
    key: 'STARTER',
    name: 'البداية',
    monthlyPrice: 200,
    yearlyPrice: 2000,
    limits: {
      students: 20,
      groups: 2,
      sessions: 100,
      storage: 100,
    },
    isActive: true,
  },
  PROFESSIONAL: {
    key: 'PROFESSIONAL',
    name: 'الاحترافية',
    monthlyPrice: 500,
    yearlyPrice: 5000,
    limits: {
      students: 100,
      groups: 10,
      sessions: 1000,
      storage: 1000,
    },
    isActive: true,
  },
  ENTERPRISE: {
    key: 'ENTERPRISE',
    name: 'المؤسسات',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: {
      students: Number.MAX_SAFE_INTEGER,
      groups: Number.MAX_SAFE_INTEGER,
      sessions: Number.MAX_SAFE_INTEGER,
      storage: Number.MAX_SAFE_INTEGER,
    },
    isActive: true,
  },
}

function normalizeLimit(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return Number.MAX_SAFE_INTEGER
  }

  return Math.trunc(value)
}

export async function getSubscriptionPlanConfigs(): Promise<Record<SubscriptionPlanType, PlanConfig>> {
  const merged: Record<SubscriptionPlanType, PlanConfig> = {
    STARTER: { ...DEFAULT_SUBSCRIPTION_PLANS.STARTER },
    PROFESSIONAL: { ...DEFAULT_SUBSCRIPTION_PLANS.PROFESSIONAL },
    ENTERPRISE: { ...DEFAULT_SUBSCRIPTION_PLANS.ENTERPRISE },
  }

  let rows: Array<{
    plan: SubscriptionPlanType
    name: string
    monthlyPrice: number
    yearlyPrice: number
    studentsLimit: number
    groupsLimit: number
    sessionsLimit: number
    storageLimit: number
    isActive: boolean
  }> = []

  try {
    rows = await db.subscriptionPlanConfig.findMany({
      select: {
        plan: true,
        name: true,
        monthlyPrice: true,
        yearlyPrice: true,
        studentsLimit: true,
        groupsLimit: true,
        sessionsLimit: true,
        storageLimit: true,
        isActive: true,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return merged
    }
    throw error
  }

  for (const row of rows) {
    merged[row.plan] = {
      key: row.plan,
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
    }
  }

  return merged
}

export async function getSubscriptionPlanConfig(plan: SubscriptionPlanType): Promise<PlanConfig> {
  const configs = await getSubscriptionPlanConfigs()
  return configs[plan]
}

export async function upsertSubscriptionPlanConfig(input: {
  plan: SubscriptionPlanType
  name: string
  monthlyPrice: number
  yearlyPrice: number
  studentsLimit: number
  groupsLimit: number
  sessionsLimit: number
  storageLimit: number
  isActive: boolean
}) {
  try {
    return db.subscriptionPlanConfig.upsert({
      where: { plan: input.plan },
      create: {
        plan: input.plan,
        name: input.name,
        monthlyPrice: Math.max(0, Math.trunc(input.monthlyPrice)),
        yearlyPrice: Math.max(0, Math.trunc(input.yearlyPrice)),
        studentsLimit: Math.max(0, Math.trunc(input.studentsLimit)),
        groupsLimit: Math.max(0, Math.trunc(input.groupsLimit)),
        sessionsLimit: Math.max(0, Math.trunc(input.sessionsLimit)),
        storageLimit: Math.max(0, Math.trunc(input.storageLimit)),
        isActive: input.isActive,
      },
      update: {
        name: input.name,
        monthlyPrice: Math.max(0, Math.trunc(input.monthlyPrice)),
        yearlyPrice: Math.max(0, Math.trunc(input.yearlyPrice)),
        studentsLimit: Math.max(0, Math.trunc(input.studentsLimit)),
        groupsLimit: Math.max(0, Math.trunc(input.groupsLimit)),
        sessionsLimit: Math.max(0, Math.trunc(input.sessionsLimit)),
        storageLimit: Math.max(0, Math.trunc(input.storageLimit)),
        isActive: input.isActive,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      throw new Error('جدول إعدادات الباقات غير موجود في قاعدة البيانات. نفّذ prisma db push أولاً.')
    }
    throw error
  }
}