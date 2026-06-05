import { Plus, Trash2 } from "lucide-react";

import { requireSuperAdminPage } from "@/lib/platform-admin";
import { createPlanConfigAction, deletePlanConfigAction, updatePlanConfigAction } from "@/modules/admin/actions";
import { getSubscriptionPlanConfigs } from "@/modules/payments/providers/plan-config";

function LimitInput({ name, label, value }: { name: string; label: string; value: number }) {
  const isUnlimited = value === Number.MAX_SAFE_INTEGER;

  return (
    <label className="block text-xs text-slate-300">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
        defaultValue={isUnlimited ? 0 : value}
        min={0}
        name={name}
        required
        type="number"
      />
    </label>
  );
}

function PlanKeyInput({ defaultValue = "", helperText }: { defaultValue?: string; helperText: string }) {
  return (
    <label className="block text-xs text-slate-300">
      مفتاح الباقة
      <input
        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
        defaultValue={defaultValue}
        dir="ltr"
        name="key"
        placeholder="PREMIUM"
      />
      <span className="mt-1 block text-[11px] text-slate-400">{helperText}</span>
    </label>
  );
}

export default async function AdminPlansPage() {
  await requireSuperAdminPage();

  const plansMap = await getSubscriptionPlanConfigs({ includeDeleted: true });
  const plans = Object.values(plansMap).sort((a, b) => a.key.localeCompare(b.key));

  return (
    <main className="space-y-6" dir="rtl">
      <header className="rounded-2xl border border-sky-300/20 bg-slate-900/55 p-4 backdrop-blur sm:rounded-3xl sm:p-6">
        <h1 className="text-2xl font-extrabold text-white">إدارة باقات الاشتراك</h1>
        <p className="mt-2 text-sm text-slate-300">أضف باقات جديدة، وعدل الأسعار والحدود، أو أخفِ الباقات غير المناسبة من الشراء.</p>
      </header>

      <section className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2 text-white">
          <Plus className="h-5 w-5 text-sky-300" />
          <h2 className="text-lg font-bold">إضافة باقة جديدة</h2>
        </div>

        <form action={createPlanConfigAction} className="grid gap-3 md:grid-cols-4">
          <label className="block text-xs text-slate-300">
            اسم الباقة
            <input
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
              name="name"
              placeholder="المميزة"
              required
            />
          </label>
          <PlanKeyInput helperText="اتركه فارغًا ليُولد تلقائيًا من الاسم." />
          <label className="block text-xs text-slate-300">
            سعر شهري
            <input
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
              min={0}
              name="monthlyPrice"
              required
              type="number"
            />
          </label>
          <label className="block text-xs text-slate-300">
            سعر سنوي
            <input
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
              min={0}
              name="yearlyPrice"
              required
              type="number"
            />
          </label>
          <LimitInput label="حد الطلاب" name="studentsLimit" value={0} />
          <LimitInput label="حد المجموعات" name="groupsLimit" value={0} />
          <LimitInput label="حد الجلسات" name="sessionsLimit" value={0} />
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
            <input defaultChecked name="isActive" type="checkbox" value="true" />
            الباقة مفعلة للشراء
          </label>
          <button
            className="rounded-lg border border-emerald-300/30 bg-emerald-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-300/25 md:col-span-4"
            type="submit"
          >
            إضافة الباقة
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.key} className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:rounded-3xl">
            <div className="mb-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                <p className="text-xs text-slate-400" dir="ltr">
                  {plan.key}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  plan.deletedAt
                    ? "border border-slate-300/30 bg-slate-400/10 text-slate-300"
                    : plan.isActive
                      ? "border border-emerald-300/30 bg-emerald-400/10 text-emerald-300"
                      : "border border-rose-300/30 bg-rose-400/10 text-rose-300"
                }`}
              >
                {plan.deletedAt ? "محذوفة" : plan.isActive ? "مفعلة" : "مغلقة"}
              </span>
            </div>

            <form action={updatePlanConfigAction} className="space-y-3">
              <input name="plan" type="hidden" value={plan.key} />
              <label className="block text-xs text-slate-300">
                اسم الباقة
                <input
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                  defaultValue={plan.name}
                  name="name"
                  required
                />
              </label>
              <PlanKeyInput defaultValue={plan.key} helperText="يمكنك تعديل المفتاح. سيتم نقل أي اشتراكات مرتبطة إلى المفتاح الجديد." />
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-300">
                  سعر شهري
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                    defaultValue={plan.monthlyPrice}
                    min={0}
                    name="monthlyPrice"
                    required
                    type="number"
                  />
                </label>
                <label className="block text-xs text-slate-300">
                  سعر سنوي
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
                    defaultValue={plan.yearlyPrice}
                    min={0}
                    name="yearlyPrice"
                    required
                    type="number"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <LimitInput label="حد الطلاب" name="studentsLimit" value={plan.limits.students} />
                <LimitInput label="حد المجموعات" name="groupsLimit" value={plan.limits.groups} />
                <LimitInput label="حد الجلسات" name="sessionsLimit" value={plan.limits.sessions} />
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
                <input
                  defaultChecked={plan.isActive && !plan.deletedAt}
                  disabled={Boolean(plan.deletedAt)}
                  name="isActive"
                  type="checkbox"
                  value="true"
                />
                الباقة مفعلة للشراء
              </label>
              <button
                className="w-full rounded-lg border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25 disabled:opacity-50"
                disabled={Boolean(plan.deletedAt)}
                type="submit"
              >
                حفظ التعديلات
              </button>
            </form>

            {!plan.deletedAt ? (
              <form action={deletePlanConfigAction} className="mt-3">
                <input name="plan" type="hidden" value={plan.key} />
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-300/20"
                  type="submit"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف الباقة
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </section>

      <p className="text-xs text-slate-400">
        ملاحظة: إدخال 0 في أي حد يعني غير محدود. حذف باقة مستخدمة يخفيها من الشراء ولا يكسر الاشتراكات الحالية.
      </p>
    </main>
  );
}
