import { getPlatformPayments, getPlatformSubscriptions, getPlatformTransfers } from "@/modules/admin/queries";

type PageProps = {
  searchParams?: Promise<{
    subscriptionStatus?: string;
    paymentStatus?: string;
    transferStatus?: string;
  }>;
};

export default async function AdminFinancePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const subscriptionStatusRaw = params.subscriptionStatus?.trim() ?? "";
  const paymentStatusRaw = params.paymentStatus?.trim() ?? "";
  const transferStatusRaw = params.transferStatus?.trim() ?? "";

  const subscriptionStatus =
    subscriptionStatusRaw === "ACTIVE" || subscriptionStatusRaw === "INACTIVE" ? subscriptionStatusRaw : undefined;
  const paymentStatus =
    paymentStatusRaw === "PAID" ||
    paymentStatusRaw === "PENDING" ||
    paymentStatusRaw === "OVERDUE" ||
    paymentStatusRaw === "PARTIAL"
      ? paymentStatusRaw
      : undefined;
  const transferStatus =
    transferStatusRaw === "PENDING" ||
    transferStatusRaw === "SUCCESS" ||
    transferStatusRaw === "FAILED" ||
    transferStatusRaw === "RETRY"
      ? transferStatusRaw
      : undefined;

  const [subscriptions, payments, transfers] = await Promise.all([
    getPlatformSubscriptions({ status: subscriptionStatus, limit: 15 }),
    getPlatformPayments({ status: paymentStatus, limit: 15 }),
    getPlatformTransfers({ status: transferStatus, limit: 15 }),
  ]);

  return (
    <main className="space-y-6" dir="rtl">
      <header className="rounded-3xl border border-sky-300/20 bg-slate-900/55 p-6 backdrop-blur">
        <h1 className="text-2xl font-extrabold text-white">المتابعة المالية</h1>
        <p className="mt-2 text-sm text-slate-300">لوحة تجمع الاشتراكات والمدفوعات والتحويلات على مستوى المنصة.</p>
      </header>

      <section className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
        <form className="grid gap-3 md:grid-cols-3" method="GET">
          <select
            className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
            defaultValue={subscriptionStatus ?? ""}
            name="subscriptionStatus"
          >
            <option value="">كل الاشتراكات</option>
            <option value="ACTIVE">نشطة</option>
            <option value="INACTIVE">غير نشطة</option>
          </select>

          <select
            className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
            defaultValue={paymentStatus ?? ""}
            name="paymentStatus"
          >
            <option value="">كل المدفوعات</option>
            <option value="PAID">مدفوع</option>
            <option value="PENDING">معلّق</option>
            <option value="OVERDUE">متأخر</option>
            <option value="PARTIAL">جزئي</option>
          </select>

          <div className="flex gap-3">
            <select
              className="w-full rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
              defaultValue={transferStatus ?? ""}
              name="transferStatus"
            >
              <option value="">كل التحويلات</option>
              <option value="SUCCESS">ناجحة</option>
              <option value="PENDING">معلّقة</option>
              <option value="RETRY">إعادة محاولة</option>
              <option value="FAILED">فاشلة</option>
            </select>
            <button className="rounded-xl border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25" type="submit">
              تطبيق
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
          <h2 className="mb-3 text-lg font-bold text-white">الاشتراكات</h2>
          <p className="mb-3 text-xs text-slate-400">آخر {subscriptions.items.length} من أصل {subscriptions.total}</p>
          <div className="space-y-2">
            {subscriptions.items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-sm">
                <p className="font-bold text-white">{item.tenant.name}</p>
                <p className="text-xs text-slate-400">{item.subscriptionPlan} / {item.billingCycle}</p>
                <p className="text-xs text-slate-300">المبلغ: {item.amount.toLocaleString("en-US")} ج.م</p>
                <p className="text-xs text-slate-300">التجديد: {new Date(item.nextBillingAt).toLocaleDateString("ar-EG")}</p>
                <p className="mt-1 text-xs font-bold">
                  <span className={item.isActive ? "text-emerald-300" : "text-rose-300"}>{item.isActive ? "نشط" : "غير نشط"}</span>
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
          <h2 className="mb-3 text-lg font-bold text-white">المدفوعات</h2>
          <p className="mb-3 text-xs text-slate-400">آخر {payments.items.length} من أصل {payments.total}</p>
          <div className="space-y-2">
            {payments.items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-sm">
                <p className="font-bold text-white">{item.tenant.name} - {item.student.name}</p>
                <p className="text-xs text-slate-400">{item.month} | {item.paymentGateway}</p>
                <p className="text-xs text-slate-300">{item.amount.toLocaleString("en-US")} ج.م</p>
                <p className="text-xs font-bold text-sky-200">{item.status}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
          <h2 className="mb-3 text-lg font-bold text-white">التحويلات</h2>
          <p className="mb-3 text-xs text-slate-400">آخر {transfers.items.length} من أصل {transfers.total}</p>
          <div className="space-y-2">
            {transfers.items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-sm">
                <p className="font-bold text-white">{item.tenant.name}</p>
                <p className="text-xs text-slate-300">المبلغ: {item.amount.toLocaleString("en-US")} ج.م | الرسوم: {item.fee.toLocaleString("en-US")} ج.م</p>
                <p className="text-xs text-slate-300">محاولات: {item.attemptCount}</p>
                <p className="text-xs font-bold text-sky-200">{item.status}</p>
                {item.failureReason ? <p className="text-xs text-rose-300">{item.failureReason}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
