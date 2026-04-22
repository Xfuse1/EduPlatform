import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'
import { decryptKashierKey, encryptKashierKey } from '@/lib/encryption'
import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'

export type SubscriptionPlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type BillingCycleType = 'MONTHLY' | 'YEARLY'

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanType,
  {
    name: string
    monthlyPrice: number
    yearlyPrice: number
    limits: {
      students: number
      groups: number
      sessions: number
      storage: number
    }
  }
> = {
  STARTER: {
    name: '??? ???????',
    monthlyPrice: 200,
    yearlyPrice: 2000,
    limits: {
      students: 20,
      groups: 2,
      sessions: 100,
      storage: 100,
    },
  },
  PROFESSIONAL: {
    name: '????? ??????????',
    monthlyPrice: 500,
    yearlyPrice: 5000,
    limits: {
      students: 100,
      groups: 10,
      sessions: 1000,
      storage: 1000,
    },
  },
  ENTERPRISE: {
    name: '??? ????????',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: {
      students: Number.MAX_SAFE_INTEGER,
      groups: Number.MAX_SAFE_INTEGER,
      sessions: Number.MAX_SAFE_INTEGER,
      storage: Number.MAX_SAFE_INTEGER,
    },
  },
}

export type SubscriptionLimits = (typeof SUBSCRIPTION_PLANS)[SubscriptionPlanType]['limits']

export async function getTeacherSubscription() {
  const tenant = await requireTenant()
  await requireAuth()

  return db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })
}

export async function createTeacherSubscription(
  plan: SubscriptionPlanType,
  cycle: BillingCycleType,
) {
  const tenant = await requireTenant()
  const actor = await requireAuth()
  return createTeacherSubscriptionForTenant(tenant.id, plan, cycle, actor.id)
}

export async function createTeacherSubscriptionForTenant(
  tenantId: string,
  plan: SubscriptionPlanType,
  cycle: BillingCycleType,
  actorId?: string,
) {
  const existing = await db.teacherSubscription.findUnique({
    where: { tenantId },
  })

  if (existing) {
    throw new Error('?????? ?????? ????? ??????')
  }

  const config = SUBSCRIPTION_PLANS[plan]
  const amount = cycle === 'MONTHLY' ? config.monthlyPrice : config.yearlyPrice

  const nextBillingAt = new Date()
  if (cycle === 'MONTHLY') nextBillingAt.setMonth(nextBillingAt.getMonth() + 1)
  else nextBillingAt.setFullYear(nextBillingAt.getFullYear() + 1)

  const subscription = await db.teacherSubscription.create({
    data: {
      tenantId,
      subscriptionPlan: plan,
      billingCycle: cycle,
      amount,
      isActive: true,
      nextBillingAt,
    },
  })

  await logFinancialEvent({
    tenantId,
    actorId: actorId ?? null,
    eventType: 'SUBSCRIPTION_UPDATED',
    entityType: 'SUBSCRIPTION',
    entityId: subscription.id,
    message: `Subscription created: ${plan}/${cycle}`,
    metadata: { amount },
  })

  return subscription
}

export async function updateSubscriptionPlan(
  newPlan: SubscriptionPlanType,
  newCycle: BillingCycleType,
) {
  const tenant = await requireTenant()
  const actor = await requireAuth()

  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!subscription) {
    throw new Error('?? ???? ?????? ???????')
  }

  const config = SUBSCRIPTION_PLANS[newPlan]
  const amount = newCycle === 'MONTHLY' ? config.monthlyPrice : config.yearlyPrice

  const nextBillingAt = new Date()
  if (newCycle === 'MONTHLY') nextBillingAt.setMonth(nextBillingAt.getMonth() + 1)
  else nextBillingAt.setFullYear(nextBillingAt.getFullYear() + 1)

  const updated = await db.teacherSubscription.update({
    where: { id: subscription.id },
    data: {
      subscriptionPlan: newPlan,
      billingCycle: newCycle,
      amount,
      nextBillingAt,
      isActive: true,
    },
  })

  await logFinancialEvent({
    tenantId: tenant.id,
    actorId: actor.id,
    eventType: 'SUBSCRIPTION_UPDATED',
    entityType: 'SUBSCRIPTION',
    entityId: updated.id,
    message: `Subscription updated: ${newPlan}/${newCycle}`,
    metadata: { amount },
  })

  return updated
}

export async function verifyActiveSubscription() {
  const subscription = await getTeacherSubscription()
  if (!subscription || !subscription.isActive) return false

  if (new Date() > subscription.nextBillingAt) {
    await db.teacherSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false },
    })
    return false
  }

  return true
}

export async function getSubscriptionLimits(): Promise<SubscriptionLimits> {
  const subscription = await getTeacherSubscription()
  if (!subscription || !subscription.isActive) {
    return SUBSCRIPTION_PLANS.STARTER.limits
  }

  return SUBSCRIPTION_PLANS[subscription.subscriptionPlan as SubscriptionPlanType].limits
}

export async function checkStudentLimit(currentCount: number): Promise<boolean> {
  const limits = await getSubscriptionLimits()
  return currentCount < limits.students
}

export async function checkGroupLimit(currentCount: number): Promise<boolean> {
  const limits = await getSubscriptionLimits()
  return currentCount < limits.groups
}

export async function addKashierApiCredentials(kashierApiKey: string, kashierMerId: string) {
  const tenant = await requireTenant()
  const actor = await requireAuth()

  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!subscription) {
    throw new Error('?? ???? ?????? ??? ??????')
  }

  const encrypted = encryptKashierKey(kashierApiKey)

  const updated = await db.teacherSubscription.update({
    where: { id: subscription.id },
    data: {
      kashierApiKey: encrypted,
      kashierMerId,
    },
  })

  await logFinancialEvent({
    tenantId: tenant.id,
    actorId: actor.id,
    eventType: 'SUBSCRIPTION_UPDATED',
    entityType: 'SUBSCRIPTION',
    entityId: updated.id,
    message: 'Teacher Kashier credentials updated',
    metadata: { hasApi: true },
  })

  return {
    success: true,
    hasApi: true,
  }
}

export async function getKashierApiCredentialsByTenantId(tenantId: string) {
  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId },
  })

  if (!subscription?.kashierApiKey || !subscription.kashierMerId) {
    throw new Error('?????? Kashier API ??? ??????')
  }

  return {
    apiKey: decryptKashierKey(subscription.kashierApiKey),
    merId: subscription.kashierMerId,
  }
}

export async function getKashierApiCredentials() {
  const tenant = await requireTenant()
  return getKashierApiCredentialsByTenantId(tenant.id)
}

export async function hasKashierApi(): Promise<boolean> {
  const subscription = await getTeacherSubscription()
  return !!(subscription?.kashierApiKey && subscription?.kashierMerId)
}

export async function cancelSubscription() {
  const tenant = await requireTenant()
  const actor = await requireAuth()

  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!subscription) {
    throw new Error('?? ???? ?????? ???????')
  }

  const updated = await db.teacherSubscription.update({
    where: { id: subscription.id },
    data: {
      isActive: false,
      cancelledAt: new Date(),
    },
  })

  await logFinancialEvent({
    tenantId: tenant.id,
    actorId: actor.id,
    eventType: 'SUBSCRIPTION_UPDATED',
    entityType: 'SUBSCRIPTION',
    entityId: updated.id,
    message: 'Subscription cancelled',
  })

  return { success: true, message: '?? ????? ????????' }
}

