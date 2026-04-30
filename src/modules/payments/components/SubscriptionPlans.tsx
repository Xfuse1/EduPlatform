'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type PlanKey = string
type Cycle = 'MONTHLY' | 'YEARLY'

type PlanItem = {
  key: PlanKey
  title: string
  monthly: number
  yearly: number
  features: string[]
  isActive: boolean
}

function getPlanLabel(plan?: string | null) {
  if (plan === 'STARTER') return 'البداية'
  if (plan === 'PROFESSIONAL') return 'الاحترافية'
  if (plan === 'ENTERPRISE') return 'المؤسسات'
  return plan
}

function getCycleLabel(cycle?: string | null) {
  if (cycle === 'MONTHLY') return 'شهري'
  if (cycle === 'YEARLY') return 'سنوي'
  return null
}

export function SubscriptionPlans({
  currentPlan,
  currentCycle,
  nextBillingAt,
  isActive,
  kashierStatus,
  plans,
}: {
  currentPlan?: string | null
  currentCycle?: string | null
  nextBillingAt?: string | null
  isActive?: boolean
  kashierStatus?: string | null
  plans: PlanItem[]
}) {
  const [billingCycle, setBillingCycle] = useState<Cycle>('MONTHLY')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startCheckout(subscriptionPlan: PlanKey) {
    setError(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/teacher/subscription/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionPlan, billingCycle }),
        })

        const payload = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(payload?.error?.message ?? payload?.message ?? 'تعذر إنشاء رابط الدفع')
        }

        const checkoutUrl = payload?.data?.checkoutUrl
        if (!checkoutUrl) throw new Error('رابط الدفع غير متوفر')

        window.location.href = checkoutUrl
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشلت عملية الدفع')
      }
    })
  }

  return (
    <div className="space-y-6 p-4">
      {kashierStatus === 'success' ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          تم استلام نتيجة الدفع بنجاح. يتم الآن تفعيل أو تحديث الاشتراك تلقائيًا.
        </div>
      ) : null}
      {kashierStatus === 'failed' ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          فشلت عملية الدفع. لم يتم تفعيل الاشتراك.
        </div>
      ) : null}
      {kashierStatus === 'pending' ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          عملية الدفع قيد المعالجة. سيتم تحديث حالة الاشتراك تلقائيًا خلال لحظات.
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-bold">خطط الاشتراك</h1>
        <p className="text-sm text-slate-500">اختر الخطة المناسبة ثم أكمل الدفع عبر كاشير.</p>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-sm text-slate-500">الاشتراك الحالي</p>
          <p className="text-lg font-bold">
            {getPlanLabel(currentPlan) ?? 'لا يوجد اشتراك نشط'} {getCycleLabel(currentCycle) ? `(${getCycleLabel(currentCycle)})` : ''}
          </p>
          <p className={isActive ? 'text-sm text-emerald-600' : 'text-sm text-amber-600'}>{isActive ? 'نشط' : 'غير نشط'}</p>
          {nextBillingAt && <p className="text-xs text-slate-500">موعد الفاتورة القادم: {new Date(nextBillingAt).toLocaleDateString('ar-EG')}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold">دورة الفوترة</p>
          <div className="flex gap-2">
            <Button type="button" variant={billingCycle === 'MONTHLY' ? 'default' : 'outline'} onClick={() => setBillingCycle('MONTHLY')}>
              شهري
            </Button>
            <Button type="button" variant={billingCycle === 'YEARLY' ? 'default' : 'outline'} onClick={() => setBillingCycle('YEARLY')}>
              سنوي
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const price = billingCycle === 'MONTHLY' ? plan.monthly : plan.yearly
          const isCurrent = currentPlan === plan.key && currentCycle === billingCycle

          return (
            <Card key={plan.key}>
              <CardContent className="space-y-3 p-4">
                <h2 className="text-lg font-bold">{plan.title}</h2>
                <p className="text-2xl font-extrabold">{price === 0 ? 'حسب الاتفاق' : `${price} ج.م`}</p>
                <div className="space-y-1 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <p key={feature}>- {feature}</p>
                  ))}
                </div>
                <Button type="button" disabled={isPending || isCurrent || !plan.isActive} onClick={() => startCheckout(plan.key)}>
                  {isCurrent ? 'الخطة الحالية' : !plan.isActive ? 'مغلقة حالياً' : isPending ? 'جارٍ المعالجة...' : 'اشترك الآن'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  )
}
