export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import { SubscriptionPlans } from '@/modules/payments/components/SubscriptionPlans'
import { getSubscriptionPlanConfigs } from '@/modules/payments/providers/plan-config'
import { getTeacherSubscription } from '@/modules/payments/providers/subscription'

export default async function PaymentsSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ kashier?: string }>
}) {
  await requireTenant()
  const user = await requireAuth()
  const params = await searchParams

  if (!['TEACHER', 'ASSISTANT'].includes(user.role)) {
    redirect(user.role === 'STUDENT' ? '/student' : '/parent')
  }

  const [subscription, plans] = await Promise.all([getTeacherSubscription(), getSubscriptionPlanConfigs()])

  return (
    <SubscriptionPlans
      currentPlan={subscription?.subscriptionPlan ?? null}
      currentCycle={subscription?.billingCycle ?? null}
      nextBillingAt={subscription?.nextBillingAt?.toISOString() ?? null}
      isActive={subscription?.isActive ?? false}
      kashierStatus={typeof params.kashier === 'string' ? params.kashier : null}
      plans={[
        {
          key: 'STARTER',
          title: plans.STARTER.name,
          monthly: plans.STARTER.monthlyPrice,
          yearly: plans.STARTER.yearlyPrice,
          features: [
            `حتى ${plans.STARTER.limits.students === Number.MAX_SAFE_INTEGER ? 'غير محدود' : plans.STARTER.limits.students} طالب`,
            `حتى ${plans.STARTER.limits.groups === Number.MAX_SAFE_INTEGER ? 'غير محدود' : plans.STARTER.limits.groups} مجموعة`,
          ],
          isActive: plans.STARTER.isActive,
        },
        {
          key: 'PROFESSIONAL',
          title: plans.PROFESSIONAL.name,
          monthly: plans.PROFESSIONAL.monthlyPrice,
          yearly: plans.PROFESSIONAL.yearlyPrice,
          features: [
            `حتى ${plans.PROFESSIONAL.limits.students === Number.MAX_SAFE_INTEGER ? 'غير محدود' : plans.PROFESSIONAL.limits.students} طالب`,
            `حتى ${plans.PROFESSIONAL.limits.groups === Number.MAX_SAFE_INTEGER ? 'غير محدود' : plans.PROFESSIONAL.limits.groups} مجموعة`,
          ],
          isActive: plans.PROFESSIONAL.isActive,
        },
        {
          key: 'ENTERPRISE',
          title: plans.ENTERPRISE.name,
          monthly: plans.ENTERPRISE.monthlyPrice,
          yearly: plans.ENTERPRISE.yearlyPrice,
          features: [
            `حد الطلاب: ${plans.ENTERPRISE.limits.students === Number.MAX_SAFE_INTEGER ? 'غير محدود' : plans.ENTERPRISE.limits.students}`,
            `حد المجموعات: ${plans.ENTERPRISE.limits.groups === Number.MAX_SAFE_INTEGER ? 'غير محدود' : plans.ENTERPRISE.limits.groups}`,
          ],
          isActive: plans.ENTERPRISE.isActive,
        },
      ]}
    />
  )
}
