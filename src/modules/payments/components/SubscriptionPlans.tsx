'use client'

import { X } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toWhatsAppUrl } from '@/lib/phone'
import { cancelTeacherSubscriptionAction } from '@/modules/payments/actions'

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

function getPlanLabel(plan?: string | null, plans: PlanItem[] = []) {
  const configuredPlan = plans.find((item) => item.key === plan)
  if (configuredPlan) return configuredPlan.title
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

function getSubscriptionSummary(plan?: string | null, cycle?: string | null, plans: PlanItem[] = [], isActive?: boolean) {
  const planLabel = getPlanLabel(plan, plans)
  const cycleLabel = getCycleLabel(cycle)

  if (!planLabel) return 'لا يوجد اشتراك نشط'
  return `${isActive ? '' : 'آخر خطة: '}${planLabel}${cycleLabel ? ` (${cycleLabel})` : ''}`
}

function DismissibleMessage({
  children,
  className,
  onDismiss,
}: {
  children: React.ReactNode
  className: string
  onDismiss: () => void
}) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${className}`}>
      <p>{children}</p>
      <button
        type="button"
        aria-label="إخفاء الرسالة"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:bg-black/10 dark:hover:bg-white/10"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function SubscriptionPlans({
  currentPlan,
  currentCycle,
  nextBillingAt,
  isActive,
  kashierStatus,
  plans,
  adminContact,
}: {
  currentPlan?: string | null
  currentCycle?: string | null
  nextBillingAt?: string | null
  isActive?: boolean
  kashierStatus?: string | null
  plans: PlanItem[]
  adminContact?: string | null
}) {
  const [billingCycle, setBillingCycle] = useState<Cycle>('MONTHLY')
  const [error, setError] = useState<string | null>(null)
  const [visibleKashierStatus, setVisibleKashierStatus] = useState(kashierStatus)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setVisibleKashierStatus(kashierStatus)
    if (!kashierStatus) return undefined

    const timer = window.setTimeout(() => {
      setVisibleKashierStatus(null)
    }, 10000)

    return () => window.clearTimeout(timer)
  }, [kashierStatus])

  useEffect(() => {
    if (!error) return undefined

    const timer = window.setTimeout(() => {
      setError(null)
    }, 10000)

    return () => window.clearTimeout(timer)
  }, [error])

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

        if (payload?.data?.activated) {
          window.location.href = '/payments/subscription?kashier=success'
          return
        }

        const checkoutUrl = payload?.data?.checkoutUrl
        if (!checkoutUrl) throw new Error('رابط الدفع غير متوفر')
        window.location.href = checkoutUrl
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشلت عملية الدفع')
      }
    })
  }

  function confirmCancelSubscription() {
    setError(null)

    startTransition(async () => {
      const result = await cancelTeacherSubscriptionAction()
      if (!result.success) {
        setError(result.message ?? 'تعذر إلغاء الاشتراك')
        setIsCancelOpen(false)
        return
      }

      window.location.href = '/payments/subscription'
    })
  }

  return (
    <div className="space-y-6 p-4">
      {visibleKashierStatus === 'success' ? (
        <DismissibleMessage
          className="border-emerald-300 bg-emerald-50 text-emerald-800"
          onDismiss={() => setVisibleKashierStatus(null)}
        >
          تم استلام نتيجة الدفع بنجاح. يتم الآن تفعيل أو تحديث الاشتراك تلقائيًا.
        </DismissibleMessage>
      ) : null}
      {visibleKashierStatus === 'failed' ? (
        <DismissibleMessage
          className="border-rose-300 bg-rose-50 text-rose-800"
          onDismiss={() => setVisibleKashierStatus(null)}
        >
          فشلت عملية الدفع. لم يتم تفعيل الاشتراك.
        </DismissibleMessage>
      ) : null}
      {visibleKashierStatus === 'pending' ? (
        <DismissibleMessage
          className="border-amber-300 bg-amber-50 text-amber-800"
          onDismiss={() => setVisibleKashierStatus(null)}
        >
          عملية الدفع قيد المعالجة. سيتم تحديث حالة الاشتراك تلقائيًا خلال لحظات.
        </DismissibleMessage>
      ) : null}

      <div>
        <h1 className="text-2xl font-bold">خطط الاشتراك</h1>
        <p className="text-sm text-slate-500">اختر الخطة المناسبة ثم أكمل الدفع عبر كاشير.</p>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-sm text-slate-500">الاشتراك الحالي</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold">
                {getSubscriptionSummary(currentPlan, currentCycle, plans, isActive)}
              </p>
              <p className={isActive ? 'text-sm text-emerald-600' : 'text-sm text-amber-600'}>{isActive ? 'نشط' : 'غير نشط'}</p>
            </div>
            {isActive ? (
              <Button
                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                disabled={isPending}
                onClick={() => setIsCancelOpen(true)}
                type="button"
                variant="outline"
              >
                إلغاء الاشتراك
              </Button>
            ) : null}
          </div>
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
          const isCurrent = Boolean(isActive) && currentPlan === plan.key && currentCycle === billingCycle

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
                {price === 0 ? (
                  adminContact ? (
                    <a
                      href={toWhatsAppUrl(adminContact)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      تواصل مع الإدارة عبر واتساب
                    </a>
                  ) : (
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      للاشتراك في هذه الباقة تواصل مع الإدارة
                    </p>
                  )
                ) : (
                  <Button type="button" disabled={isPending || isCurrent || !plan.isActive} onClick={() => startCheckout(plan.key)}>
                    {isCurrent ? 'الخطة الحالية' : !plan.isActive ? 'مغلقة حالياً' : isPending ? 'جارٍ المعالجة...' : 'اشترك الآن'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error ? (
        <DismissibleMessage
          className="border-rose-300 bg-rose-50 text-rose-800"
          onDismiss={() => setError(null)}
        >
          {error}
        </DismissibleMessage>
      ) : null}

      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد إلغاء الاشتراك</DialogTitle>
            <DialogDescription>
              لن يكون هناك أي استرداد للمبلغ المالي المدفوع بعد إلغاء الاشتراك. هل أنت متأكد أنك تريد المتابعة؟
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-5 sm:p-6">
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              الإلغاء سيوقف الاشتراك النشط، ولن يتم رد أي مبالغ تم دفعها.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCancelOpen(false)} disabled={isPending}>
                لا، رجوع
              </Button>
              <Button
                className="bg-rose-600 text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700"
                type="button"
                onClick={confirmCancelSubscription}
                disabled={isPending}
              >
                {isPending ? 'جارٍ الإلغاء...' : 'نعم، إلغاء الاشتراك'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
