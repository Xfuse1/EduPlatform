import { db } from '@/lib/db'

// ── Subscription & Limits Helpers ──────────────────────────────────────────

/**
 * التحقق من أن المعلم يستطيع إضافة طالب جديد
 */
export async function canAddStudent(tenantId: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  message?: string
}> {
  try {
    // جيب الاشتراك
    const subscription = await db.teacherSubscription.findUnique({
      where: { tenantId },
    })

    if (!subscription || !subscription.isActive) {
      return {
        allowed: false,
        currentCount: 0,
        limit: 0,
        message: 'لا يوجد اشتراك نشط — يرجى تجديد الاشتراك أولاً',
      }
    }

    // التحقق من انتهاء الاشتراك
    if (new Date() > subscription.nextBillingAt) {
      return {
        allowed: false,
        currentCount: 0,
        limit: 0,
        message: 'انتهى الاشتراك — يرجى التجديد',
      }
    }

    // حسب عدد الطلاب الحاليين
    const studentCount = await db.groupStudent.count({
      where: {
        group: { tenantId },
        status: 'ACTIVE',
      },
    })

    // حسب الحد الأقصى حسب الخطة
    const limits: Record<string, number> = {
      STARTER: 20,
      PROFESSIONAL: 100,
      ENTERPRISE: Infinity,
    }

    const limit = limits[subscription.subscriptionPlan]

    return {
      allowed: studentCount < limit,
      currentCount: studentCount,
      limit,
      message:
        studentCount >= limit
          ? `وصلت لحد الطلاب الأقصى (${limit})`
          : undefined,
    }
  } catch (error) {
    console.error('Error checking student limit:', error)
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      message: 'خطأ في التحقق من الحد الأقصى',
    }
  }
}

/**
 * التحقق من أن المعلم يستطيع إضافة مجموعة جديدة
 */
export async function canAddGroup(tenantId: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  message?: string
}> {
  try {
    // جيب الاشتراك
    const subscription = await db.teacherSubscription.findUnique({
      where: { tenantId },
    })

    if (!subscription || !subscription.isActive) {
      return {
        allowed: false,
        currentCount: 0,
        limit: 0,
        message: 'لا يوجد اشتراك نشط',
      }
    }

    // حسب عدد المجموعات الحالية
    const groupCount = await db.group.count({
      where: { tenantId, isActive: true },
    })

    // حسب الحد الأقصى
    const limits: Record<string, number> = {
      STARTER: 2,
      PROFESSIONAL: 10,
      ENTERPRISE: Infinity,
    }

    const limit = limits[subscription.subscriptionPlan]

    return {
      allowed: groupCount < limit,
      currentCount: groupCount,
      limit,
      message:
        groupCount >= limit
          ? `وصلت لحد المجموعات الأقصى (${limit})`
          : undefined,
    }
  } catch (error) {
    console.error('Error checking group limit:', error)
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      message: 'خطأ في التحقق من الحد الأقصى',
    }
  }
}

/**
 * الحصول على نسبة استخدام الاشتراك
 */
export async function getSubscriptionUsage(tenantId: string) {
  try {
    const subscription = await db.teacherSubscription.findUnique({
      where: { tenantId },
    })

    if (!subscription) {
      return { status: 'no_subscription', data: null }
    }

    const studentCount = await db.groupStudent.count({
      where: { group: { tenantId } },
    })

    const groupCount = await db.group.count({
      where: { tenantId },
    })

    const limits: Record<string, any> = {
      STARTER: { students: 20, groups: 2 },
      PROFESSIONAL: { students: 100, groups: 10 },
      ENTERPRISE: { students: Infinity, groups: Infinity },
    }

    const limit = limits[subscription.subscriptionPlan]
    const daysUntilExpiry = Math.ceil(
      (subscription.nextBillingAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )

    return {
      status: subscription.isActive ? 'active' : 'inactive',
      data: {
        plan: subscription.subscriptionPlan,
        billingCycle: subscription.billingCycle,
        nextBillingAt: subscription.nextBillingAt,
        daysUntilExpiry,
        hasKashierApi: !!subscription.kashierApiKey,
        usage: {
          students: {
            current: studentCount,
            limit: limit.students,
            percentage:
              limit.students === Infinity
                ? 0
                : (studentCount / limit.students) * 100,
          },
          groups: {
            current: groupCount,
            limit: limit.groups,
            percentage:
              limit.groups === Infinity
                ? 0
                : (groupCount / limit.groups) * 100,
          },
        },
      },
    }
  } catch (error) {
    console.error('Error getting subscription usage:', error)
    return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * التحقق من أن الاشتراك سينتهي قريباً (خلال 7 أيام)
 */
export async function isSubscriptionExpiringSoon(tenantId: string): Promise<boolean> {
  try {
    const subscription = await db.teacherSubscription.findUnique({
      where: { tenantId },
    })

    if (!subscription) return false

    const daysUntilExpiry = Math.ceil(
      (subscription.nextBillingAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )

    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  } catch (error) {
    return false
  }
}
