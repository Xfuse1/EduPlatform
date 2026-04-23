import { updatePlanConfigAction } from '@/modules/admin/actions'
import { getSubscriptionPlanConfigs } from '@/modules/payments/providers/plan-config'

const planKeys = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const

export default async function AdminPlansPage() {
  const plans = await getSubscriptionPlanConfigs()

  return (
    <main className="space-y-6" dir="rtl">
      <header className="rounded-3xl border border-sky-300/20 bg-slate-900/55 p-6 backdrop-blur">
        <h1 className="text-2xl font-extrabold text-white">إدارة باقات الاشتراك</h1>
        <p className="mt-2 text-sm text-slate-300">تحكم في أسعار الباقات وحدودها، وأغلق/افتح أي باقة فوراً.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {planKeys.map((planKey) => {
          const plan = plans[planKey]
          const isUnlimited = (value: number) => value === Number.MAX_SAFE_INTEGER

          return (
            <article key={planKey} className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{planKey}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${plan.isActive ? 'border border-emerald-300/30 bg-emerald-400/10 text-emerald-300' : 'border border-rose-300/30 bg-rose-400/10 text-rose-300'}`}>
                  {plan.isActive ? 'مفعلة' : 'مغلقة'}
                </span>
              </div>

              <form action={updatePlanConfigAction} className="space-y-3">
                <input type="hidden" name="plan" value={planKey} />

                <label className="block text-xs text-slate-300">
                  اسم الباقة
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                    defaultValue={plan.name}
                    name="name"
                    required
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-slate-300">
                    سعر شهري
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                      defaultValue={plan.monthlyPrice}
                      min={0}
                      name="monthlyPrice"
                      type="number"
                      required
                    />
                  </label>

                  <label className="block text-xs text-slate-300">
                    سعر سنوي
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                      defaultValue={plan.yearlyPrice}
                      min={0}
                      name="yearlyPrice"
                      type="number"
                      required
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-slate-300">
                    حد الطلاب
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                      defaultValue={isUnlimited(plan.limits.students) ? 0 : plan.limits.students}
                      min={0}
                      name="studentsLimit"
                      type="number"
                      required
                    />
                  </label>

                  <label className="block text-xs text-slate-300">
                    حد المجموعات
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                      defaultValue={isUnlimited(plan.limits.groups) ? 0 : plan.limits.groups}
                      min={0}
                      name="groupsLimit"
                      type="number"
                      required
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-slate-300">
                    حد الجلسات
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                      defaultValue={isUnlimited(plan.limits.sessions) ? 0 : plan.limits.sessions}
                      min={0}
                      name="sessionsLimit"
                      type="number"
                      required
                    />
                  </label>

                  <label className="block text-xs text-slate-300">
                    حد التخزين
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                      defaultValue={isUnlimited(plan.limits.storage) ? 0 : plan.limits.storage}
                      min={0}
                      name="storageLimit"
                      type="number"
                      required
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
                  <input defaultChecked={plan.isActive} name="isActive" type="checkbox" value="true" />
                  الباقة مفعلة للشراء
                </label>

                <button className="w-full rounded-lg border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25" type="submit">
                  حفظ التعديلات
                </button>
              </form>
            </article>
          )
        })}
      </section>

      <p className="text-xs text-slate-400">ملاحظة: إدخال 0 في أي حد يعني غير محدود.</p>
    </main>
  )
}
