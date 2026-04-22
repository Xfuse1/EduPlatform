export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import { SubscriptionPlans } from '@/modules/payments/components/SubscriptionPlans'
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

  const subscription = await getTeacherSubscription()

  return (
    <SubscriptionPlans
      currentPlan={subscription?.subscriptionPlan ?? null}
      currentCycle={subscription?.billingCycle ?? null}
      nextBillingAt={subscription?.nextBillingAt?.toISOString() ?? null}
      isActive={subscription?.isActive ?? false}
      kashierStatus={typeof params.kashier === 'string' ? params.kashier : null}
    />
  )
}
