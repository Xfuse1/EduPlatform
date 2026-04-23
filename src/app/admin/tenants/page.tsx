import Link from "next/link";

import { setTenantStatusAction } from "@/modules/admin/actions";
import { getPlatformTenants } from "@/modules/admin/queries";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminTenantsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() ?? "";
  const statusRaw = params.status?.trim() ?? "";
  const status = statusRaw === "ACTIVE" || statusRaw === "INACTIVE" ? statusRaw : "";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const tenantsResult = await getPlatformTenants({
    search: q || undefined,
    status: status || undefined,
    limit,
    offset,
  });

  const totalPages = Math.max(Math.ceil(tenantsResult.total / limit), 1);

  const makeUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    params.set("page", String(nextPage));
    return `/admin/tenants?${params.toString()}`;
  };

  return (
    <main className="space-y-6" dir="rtl">
      <header className="rounded-3xl border border-sky-300/20 bg-slate-900/55 p-6 backdrop-blur">
        <h1 className="text-2xl font-extrabold text-white">إدارة المؤسسات</h1>
        <p className="mt-2 text-sm text-slate-300">تحكم مباشر في حالة المؤسسات مع عرض ملخص الاشتراك والاستخدام.</p>
      </header>

      <section className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
        <form className="grid gap-3 sm:grid-cols-3" method="GET">
          <input
            className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-300/40"
            defaultValue={q}
            name="q"
            placeholder="ابحث باسم المؤسسة أو slug"
          />

          <select
            className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
            defaultValue={status}
            name="status"
          >
            <option value="">كل الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="INACTIVE">موقوف</option>
          </select>

          <button className="rounded-xl border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25" type="submit">
            تطبيق الفلاتر
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-300">عدد النتائج: {tenantsResult.total}</p>
          <p className="text-xs text-slate-400">صفحة {page} من {totalPages}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-slate-300">
                <th className="px-3 py-2 text-right font-semibold">المؤسسة</th>
                <th className="px-3 py-2 text-right font-semibold">الخطة</th>
                <th className="px-3 py-2 text-right font-semibold">المستخدمون</th>
                <th className="px-3 py-2 text-right font-semibold">المدفوعات</th>
                <th className="px-3 py-2 text-right font-semibold">حالة الاشتراك</th>
                <th className="px-3 py-2 text-right font-semibold">الحالة</th>
                <th className="px-3 py-2 text-right font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {tenantsResult.items.map((tenant) => (
                <tr key={tenant.id} className="rounded-2xl bg-slate-950/50 text-slate-200">
                  <td className="rounded-r-xl px-3 py-3">
                    <p className="font-bold text-white">{tenant.name}</p>
                    <p className="text-xs text-slate-400">{tenant.slug}</p>
                  </td>
                  <td className="px-3 py-3">{tenant.plan}</td>
                  <td className="px-3 py-3">{tenant._count.users}</td>
                  <td className="px-3 py-3">{tenant._count.payments}</td>
                  <td className="px-3 py-3 text-xs text-slate-300">
                    {tenant.teacherSubscription ? (
                      <>
                        <p>
                          {tenant.teacherSubscription.subscriptionPlan} / {tenant.teacherSubscription.billingCycle}
                        </p>
                        <p>تجديد: {new Date(tenant.teacherSubscription.nextBillingAt).toLocaleDateString("ar-EG")}</p>
                      </>
                    ) : (
                      "لا يوجد اشتراك"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        tenant.isActive
                          ? "border border-emerald-300/30 bg-emerald-400/10 text-emerald-300"
                          : "border border-rose-300/30 bg-rose-400/10 text-rose-300"
                      }`}
                    >
                      {tenant.isActive ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td className="rounded-l-xl px-3 py-3">
                    <form action={setTenantStatusAction}>
                      <input name="tenantId" type="hidden" value={tenant.id} />
                      <input name="isActive" type="hidden" value={tenant.isActive ? "false" : "true"} />
                      <button
                        className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                          tenant.isActive
                            ? "border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                            : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                        }`}
                        type="submit"
                      >
                        {tenant.isActive ? "إيقاف المؤسسة" : "تفعيل المؤسسة"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href={page > 1 ? makeUrl(page - 1) : "#"}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${
              page > 1
                ? "border-slate-600 bg-slate-950/40 text-white hover:border-sky-300/35"
                : "cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-500"
            }`}
          >
            السابق
          </Link>
          <Link
            href={page < totalPages ? makeUrl(page + 1) : "#"}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${
              page < totalPages
                ? "border-slate-600 bg-slate-950/40 text-white hover:border-sky-300/35"
                : "cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-500"
            }`}
          >
            التالي
          </Link>
        </div>
      </section>
    </main>
  );
}
