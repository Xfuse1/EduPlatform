'use server'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { SubscriptionPlan, BillingCycle } from '@prisma/client'

// ── Subscription Plans Configuration ───────────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: 'خطة البداية',
    monthlyPrice: 20000, // 200 جنيه
    yearlyPrice: 200000, // 2000 جنيه
    limits: {
      students: 20,
      groups: 2,
      sessions: 100,
      storage: 100, // MB
    },
  },
  PROFESSIONAL: {
    name: 'خطة احترافية',
    monthlyPrice: 50000, // 500 جنيه
    yearlyPrice: 500000, // 5000 جنيه
    limits: {
      students: 100,
      groups: 10,
      sessions: 1000,
      storage: 1000, // MB
    },
  },
  ENTERPRISE: {
    name: 'خطة المؤسسات',
    monthlyPrice: 0, // حسب الطلب
    yearlyPrice: 0,
    limits: {
      students: Infinity,
      groups: Infinity,
      sessions: Infinity,
      storage: Infinity,
    },
  },
} as const

export type SubscriptionLimits = typeof SUBSCRIPTION_PLANS.STARTER.limits

/**
 * الحصول على معلومات اشتراك المعلم الحالية
 */
export async function getTeacherSubscription() {
  const tenant = await requireTenant()
  await requireAuth()

  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!subscription) {
    throw new Error('المعلم لم ينشئ اشتراك بعد')
  }

  return subscription
}

/**
 * إنشاء اشتراك جديد للمعلم
 * يُستدعى بعد الدفع الناجح عبر Kashier
 */
export async function createTeacherSubscription(
  plan: SubscriptionPlan,
  cycle: BillingCycle,
) {
  const tenant = await requireTenant()
  await requireAuth()

  // تحقق من عدم وجود اشتراك موجود
  const existing = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (existing) {
    throw new Error('المعلم لديه اشتراك موجود بالفعل')
  }

  const planConfig = SUBSCRIPTION_PLANS[plan]
  const amount = cycle === 'MONTHLY' ? planConfig.monthlyPrice : planConfig.yearlyPrice

  // حساب تاريخ الدفع التالي
  const nextBillingAt = new Date()
  if (cycle === 'MONTHLY') {
    nextBillingAt.setMonth(nextBillingAt.getMonth() + 1)
  } else {
    nextBillingAt.setFullYear(nextBillingAt.getFullYear() + 1)
  }

  const subscription = await db.teacherSubscription.create({
    data: {
      tenantId: tenant.id,
      subscriptionPlan: plan,
      billingCycle: cycle,
      amount,
      nextBillingAt,
      isActive: true,
    },
  })

  return subscription
}

/**
 * تحديث خطة الاشتراك
 */
export async function updateSubscriptionPlan(
  newPlan: SubscriptionPlan,
  newCycle: BillingCycle,
) {
  const tenant = await requireTenant()
  await requireAuth()

  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!subscription) {
    throw new Error('المعلم لا يملك اشتراك')
  }

  const planConfig = SUBSCRIPTION_PLANS[newPlan]
  const newAmount = newCycle === 'MONTHLY' ? planConfig.monthlyPrice : planConfig.yearlyPrice

  // حساب التاريخ التالي
  const nextBillingAt = new Date()
  if (newCycle === 'MONTHLY') {
    nextBillingAt.setMonth(nextBillingAt.getMonth() + 1)
  } else {
    nextBillingAt.setFullYear(nextBillingAt.getFullYear() + 1)
  }

  const updated = await db.teacherSubscription.update({
    where: { id: subscription.id },
    data: {
      subscriptionPlan: newPlan,
      billingCycle: newCycle,
      amount: newAmount,
      nextBillingAt,
    },
  })

  return updated
}

/**
 * التحقق من أن المعلم له اشتراك نشط وصالح
 */
export async function verifyActiveSubscription() {
  const tenant = await requireTenant()

  const subscription = await db.teacherSubscription.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!subscription || !subscription.isActive) {
    return false
  }

  // التحقق من عدم انتهاء الاشتراك
  if (new Date() > subscription.nextBillingAt) {
    // الاشتراك انتهى — أوقفه
    await db.teacherSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false },
    })
    return false
  }

  return true
}

/**
 * الحصول على حدود الاستخدام حسب الخطة
 */
export async function getSubscriptionLimits(): Promise<SubscriptionLimits> {
  const subscription = await getTeacherSubscription()
  return SUBSCRIPTION_PLANS[subscription.subscriptionPlan].limits
}

/**
 * التحقق من عدم تجاوز الحد الأقصى للطلاب
 */
export async function checkStudentLimit(currentCount: number): Promise<boolean> {
  const limits = await getSubscriptionLimits()
  return currentCount < limits.students
}

/**
 * التحقق من عدم تجاوز الحد الأقصى للمجموعات
 */
export async function checkGroupLimit(currentCount: number): Promise<boolean> {
  const limits = await getSubscriptionLimits()
  return currentCount < limits.groups
}

/**
 * إضافة Kashier API الخاص بالمعلم (مشفر)
 */
export async function addKashierApiCredentials(
  kashierApiKey: string,
  kashierMerId: string,
) {
  const subscription = await getTeacherSubscription()

  // TODO: تشفير المفتاح قبل الحفظ
  // استخدم bcrypt أو libsodium
  const encrypted = kashierApiKey // placeholder

  const updated = await db.teacherSubscription.update({
    where: { id: subscription.id },
    data: {
      kashierApiKey: encrypted,
      kashierMerId,
    },
  })

  return { success: true, message: 'تم حفظ بيانات Kashier بنجاح' }
}

/**
 * الحصول على Kashier API (مفكك التشفير)
 * يُستخدم فقط للتحويل التلقائي
 */
export async function getKashierApiCredentials() {
  const subscription = await getTeacherSubscription()

  if (!subscription.kashierApiKey || !subscription.kashierMerId) {
    throw new Error('لم تضف بيانات Kashier API بعد')
  }

  // TODO: فك تشفير المفتاح
  const decrypted = subscription.kashierApiKey // placeholder

  return {
    apiKey: decrypted,
    merId: subscription.kashierMerId,
  }
}

/**
 * التحقق من إضافة Kashier API
 */
export async function hasKashierApi(): Promise<boolean> {
  try {
    const subscription = await getTeacherSubscription()
    return !!(subscription.kashierApiKey && subscription.kashierMerId)
  } catch {
    return false
  }
}

/**
 * إلغاء اشتراك المعلم
 */
export async function cancelSubscription() {
  const subscription = await getTeacherSubscription()

  const updated = await db.teacherSubscription.update({
    where: { id: subscription.id },
    data: {
      isActive: false,
      cancelledAt: new Date(),
    },
  })

  return { success: true, message: 'تم إلغاء الاشتراك' }
}
