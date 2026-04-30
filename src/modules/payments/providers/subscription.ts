import { db } from '@/lib/db'
import { logFinancialEvent } from '@/lib/financial-audit'
import { decryptKashierKey, encryptKashierKey } from '@/lib/encryption'
import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'

import {
  DEFAULT_SUBSCRIPTION_PLANS,
  type SubscriptionPlanType,
  getSubscriptionPlanConfig,
  getSubscriptionPlanConfigs,
} from './plan-config'

export type BillingCycleType = 'MONTHLY' | 'YEARLY'

export const SUBSCRIPTION_PLANS = DEFAULT_SUBSCRIPTION_PLANS

export type SubscriptionLimits = {
  students: number
  groups: number
  sessions: number
  storage: number
}

function calculateNextBillingAt(baseDate: Date, cycle: BillingCycleType) {
  const next = new Date(baseDate)
  if (cycle === 'MONTHLY') next.setMonth(next.getMonth() + 1)
  else next.setFullYear(next.getFullYear() + 1)
  return next
}

export async function getTeacherSubscription() {
  const tenant = await requireTenant()
  await requireAuth()

  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!subscription) return null

  if (subscription.isActive && new Date() > subscription.nextBillingAt) {
    return db.teacherSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false },
    })
  }

  return subscription
}

export async function createTeacherSubscription(plan: SubscriptionPlanType, cycle: BillingCycleType) {
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
    throw new Error('يوجد اشتراك بالفعل لهذه المؤسسة')
  }

  const config = await getSubscriptionPlanConfig(plan)
  const amount = cycle === 'MONTHLY' ? config.monthlyPrice : config.yearlyPrice

  const nextBillingAt = calculateNextBillingAt(new Date(), cycle)

  const subscription = await db.teacherSubscription.create({
    data: {
      tenantId,
      subscriptionPlan: config.legacyPlan ?? 'STARTER',
      planKey: config.key,
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
    message: `Subscription created: ${config.key}/${cycle}`,
    metadata: { amount },
  })

  return subscription
}

export async function activateOrRenewSubscriptionForTenant(
  tenantId: string,
  plan: SubscriptionPlanType,
  cycle: BillingCycleType,
  actorId?: string,
) {
  const existing = await db.teacherSubscription.findUnique({
    where: { tenantId },
  })

  const config = await getSubscriptionPlanConfig(plan)
  const amount = cycle === 'MONTHLY' ? config.monthlyPrice : config.yearlyPrice
  const now = new Date()

  const baseDate = existing?.nextBillingAt && existing.nextBillingAt > now ? existing.nextBillingAt : now
  const nextBillingAt = calculateNextBillingAt(baseDate, cycle)

  const subscription = existing
    ? await db.teacherSubscription.update({
        where: { id: existing.id },
        data: {
          subscriptionPlan: config.legacyPlan ?? existing.subscriptionPlan,
          planKey: config.key,
          billingCycle: cycle,
          amount,
          isActive: true,
          cancelledAt: null,
          nextBillingAt,
        },
      })
    : await db.teacherSubscription.create({
        data: {
          tenantId,
          subscriptionPlan: config.legacyPlan ?? 'STARTER',
          planKey: config.key,
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
    message: existing ? `Subscription renewed: ${config.key}/${cycle}` : `Subscription created: ${config.key}/${cycle}`,
    metadata: { amount, nextBillingAt: nextBillingAt.toISOString() },
  })

  return subscription
}

export async function updateSubscriptionPlan(newPlan: SubscriptionPlanType, newCycle: BillingCycleType) {
  const tenant = await requireTenant()
  const actor = await requireAuth()

  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!subscription) {
    throw new Error('لا يوجد اشتراك حالي')
  }

  const config = await getSubscriptionPlanConfig(newPlan)
  const amount = newCycle === 'MONTHLY' ? config.monthlyPrice : config.yearlyPrice

  const nextBillingAt = new Date()
  if (newCycle === 'MONTHLY') nextBillingAt.setMonth(nextBillingAt.getMonth() + 1)
  else nextBillingAt.setFullYear(nextBillingAt.getFullYear() + 1)

  const updated = await db.teacherSubscription.update({
    where: { id: subscription.id },
    data: {
      subscriptionPlan: config.legacyPlan ?? subscription.subscriptionPlan,
      planKey: config.key,
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
    message: `Subscription updated: ${config.key}/${newCycle}`,
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
  const configs = await getSubscriptionPlanConfigs()
  const subscription = await getTeacherSubscription()
  if (!subscription || !subscription.isActive) {
    return configs.STARTER?.limits ?? Object.values(configs)[0]?.limits ?? { students: 0, groups: 0, sessions: 0, storage: 0 }
  }

  return (configs[subscription.planKey] ?? configs[subscription.subscriptionPlan])?.limits ?? configs.STARTER.limits
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
    throw new Error('لا يوجد اشتراك لإضافة API')
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
    throw new Error('بيانات Kashier API غير متاحة')
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
    throw new Error('لا يوجد اشتراك حالي')
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

  return { success: true, message: 'تم إلغاء الاشتراك' }
}
