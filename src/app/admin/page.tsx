export const dynamic = "force-dynamic";

import Link from "next/link";
import { Activity, ArrowUpLeft, Building2, CreditCard, RefreshCw, ShieldAlert, Users } from "lucide-react";
import type { ComponentType } from "react";

import { getPlatformOverview, getPlatformTenants, getPlatformUsers } from "@/modules/admin/queries";

export default async function SuperAdminDashboardPage() {
  const [overview, tenantsResult, usersResult] = await Promise.all([
    getPlatformOverview(),
    getPlatformTenants({ limit: 6 }),
    getPlatformUsers({ limit: 6 }),
  ]);

  return (
    <main className="space-y-6" dir="rtl">
      <header className="rounded-3xl border border-sky-300/20 bg-slate-900/55 p-6 shadow-[0_16px_45px_rgba(2,8,23,0.45)] backdrop-blur">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-200">
          <ShieldAlert className="h-3.5 w-3.5" />
          تحكم شامل على مستوى المنصة
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">لوحة السوبر أدمن</h1>
        <p className="mt-2 text-sm text-slate-300">ملخص سريع للمؤسسات والمستخدمين والمدفوعات.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <QuickLink href="/admin/tenants" title="إدارة المؤسسات" description="تفعيل/إيقاف ومتابعة الحالة." />
        <QuickLink href="/admin/users" title="إدارة المستخدمين" description="بحث وتصفية حسب الدور والمؤسسة." />
        <QuickLink href="/admin/finance" title="المتابعة المالية" description="اشتراكات، مدفوعات، وتحويلات." />
        <QuickLink href="/admin/plans" title="إدارة الباقات" description="تعديل الأسعار والقيود وتفعيل الباقات." />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="كل المؤسسات" value={overview.tenantsTotal} />
        <StatCard icon={Activity} label="المؤسسات النشطة" value={overview.tenantsActive} />
        <StatCard icon={Users} label="كل المستخدمين" value={overview.usersTotal} />
        <StatCard icon={CreditCard} label="كل المدفوعات" value={overview.paymentsTotal} />
        <StatCard icon={CreditCard} label="إجمالي المحصل" value={overview.totalRevenue} isMoney />
        <StatCard icon={RefreshCw} label="اشتراكات نشطة" value={overview.activeSubscriptions} />
        <StatCard icon={RefreshCw} label="تحويلات معلقة/إعادة" value={overview.pendingTransfers} />
        <StatCard icon={ShieldAlert} label="تحويلات فاشلة" value={overview.failedTransfers} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-5 shadow-[0_16px_45px_rgba(2,8,23,0.35)] backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">آخر المؤسسات</h2>
            <p className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-200">الإجمالي: {tenantsResult.total}</p>
          </div>

          <div className="space-y-3">
            {tenantsResult.items.map((tenant) => (
              <article key={tenant.id} className="rounded-2xl border border-slate-700/60 bg-slate-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-white">{tenant.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{tenant.slug}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      tenant.isActive
                        ? "border border-emerald-300/30 bg-emerald-400/10 text-emerald-300"
                        : "border border-rose-300/30 bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    {tenant.isActive ? "نشط" : "موقوف"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-300">
                  مستخدمين: <span className="font-bold text-white">{tenant._count.users}</span> | مجموعات:{" "}
                  <span className="font-bold text-white">{tenant._count.groups}</span> | مدفوعات:{" "}
                  <span className="font-bold text-white">{tenant._count.payments}</span>
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-5 shadow-[0_16px_45px_rgba(2,8,23,0.35)] backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">آخر المستخدمين</h2>
            <p className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-200">الإجمالي: {usersResult.total}</p>
          </div>

          <div className="space-y-3">
            {usersResult.items.map((user) => (
              <article key={user.id} className="rounded-2xl border border-slate-700/60 bg-slate-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-white">{user.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {user.role} - {user.phone}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      user.isActive
                        ? "border border-emerald-300/30 bg-emerald-400/10 text-emerald-300"
                        : "border border-rose-300/30 bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    {user.isActive ? "نشط" : "غير نشط"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-300">
                  المؤسسة: <span className="font-bold text-white">{user.tenant.name}</span> ({user.tenant.slug})
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-sky-300/20 bg-slate-900/55 p-4 shadow-[0_12px_35px_rgba(2,8,23,0.33)] transition hover:-translate-y-0.5 hover:border-sky-300/35"
    >
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-white">{title}</p>
        <ArrowUpLeft className="h-4 w-4 text-slate-400 transition group-hover:text-sky-200" />
      </div>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </Link>
  );
}

function StatCard({
  label,
  value,
  isMoney = false,
  icon: Icon,
}: {
  label: string;
  value: number;
  isMoney?: boolean;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <article className="rounded-2xl border border-sky-300/20 bg-slate-900/55 p-4 shadow-[0_12px_35px_rgba(2,8,23,0.33)] backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 text-sky-200">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-white">
        {isMoney ? `${value.toLocaleString("en-US")} ج.م` : value.toLocaleString("en-US")}
      </p>
    </article>
  );
}
