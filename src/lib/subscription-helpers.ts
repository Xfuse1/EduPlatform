import { db } from '@/lib/db'
import { getSubscriptionPlanConfigs } from '@/modules/payments/providers/plan-config'

export async function canAddStudent(tenantId: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  message?: string
}> {
  try {
    const subscription = await db.teacherSubscription.findUnique({ where: { tenantId } })

    if (!subscription || !subscription.isActive) {
      return {
        allowed: false,
        currentCount: 0,
        limit: 0,
        message: 'لا يوجد اشتراك نشط — يرجى التجديد أولاً',
      }
    }

    if (new Date() > subscription.nextBillingAt) {
      return {
        allowed: false,
        currentCount: 0,
        limit: 0,
        message: 'انتهى الاشتراك — يرجى التجديد',
      }
    }

    const studentCount = await db.groupStudent.count({
      where: { group: { tenantId }, status: 'ACTIVE' },
    })

    const plans = await getSubscriptionPlanConfigs()
    const limit = plans[subscription.subscriptionPlan].limits.students

    return {
      allowed: studentCount < limit,
      currentCount: studentCount,
      limit,
      message: studentCount >= limit ? `وصلت لحد الطلاب الأقصى (${limit})` : undefined,
    }
  } catch (error) {
    console.error('Error checking student limit:', error)
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      message: 'خطأ في التحقق من حد الطلاب',
    }
  }
}

export async function canAddGroup(tenantId: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  message?: string
}> {
  try {
    const subscription = await db.teacherSubscription.findUnique({ where: { tenantId } })

    if (!subscription || !subscription.isActive) {
      return {
        allowed: false,
        currentCount: 0,
        limit: 0,
        message: 'لا يوجد اشتراك نشط',
      }
    }

    const groupCount = await db.group.count({ where: { tenantId, isActive: true } })

    const plans = await getSubscriptionPlanConfigs()
    const limit = plans[subscription.subscriptionPlan].limits.groups

    return {
      allowed: groupCount < limit,
      currentCount: groupCount,
      limit,
      message: groupCount >= limit ? `وصلت لحد المجموعات الأقصى (${limit})` : undefined,
    }
  } catch (error) {
    console.error('Error checking group limit:', error)
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      message: 'خطأ في التحقق من حد المجموعات',
    }
  }
}

export async function getSubscriptionUsage(tenantId: string) {
  try {
    const subscription = await db.teacherSubscription.findUnique({ where: { tenantId } })

    if (!subscription) {
      return { status: 'no_subscription', data: null }
    }

    const studentCount = await db.groupStudent.count({ where: { group: { tenantId } } })
    const groupCount = await db.group.count({ where: { tenantId } })

    const plans = await getSubscriptionPlanConfigs()
    const limit = plans[subscription.subscriptionPlan].limits

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
              limit.students === Number.MAX_SAFE_INTEGER ? 0 : (studentCount / limit.students) * 100,
          },
          groups: {
            current: groupCount,
            limit: limit.groups,
            percentage: limit.groups === Number.MAX_SAFE_INTEGER ? 0 : (groupCount / limit.groups) * 100,
          },
        },
      },
    }
  } catch (error) {
    console.error('Error getting subscription usage:', error)
    return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function isSubscriptionExpiringSoon(tenantId: string): Promise<boolean> {
  try {
    const subscription = await db.teacherSubscription.findUnique({ where: { tenantId } })

    if (!subscription) return false

    const daysUntilExpiry = Math.ceil(
      (subscription.nextBillingAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )

    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  } catch {
    return false
  }
}
