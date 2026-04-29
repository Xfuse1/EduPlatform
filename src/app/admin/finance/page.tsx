import { adjustUserWalletAction } from "@/modules/admin/actions";
import {
  getPlatformPayments,
  getPlatformSubscriptions,
  getPlatformTransfers,
  getPlatformWallets,
  getPlatformWalletWithdrawals,
} from "@/modules/admin/queries";

type PageProps = {
  searchParams?: Promise<{
    subscriptionStatus?: string;
    paymentStatus?: string;
    transferStatus?: string;
    withdrawalStatus?: string;
    walletRole?: string;
    walletBalance?: string;
    walletSearch?: string;
  }>;
};

export default async function AdminFinancePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const subscriptionStatusRaw = params.subscriptionStatus?.trim() ?? "";
  const paymentStatusRaw = params.paymentStatus?.trim() ?? "";
  const transferStatusRaw = params.transferStatus?.trim() ?? "";
  const withdrawalStatusRaw = params.withdrawalStatus?.trim() ?? "";
  const walletRole = params.walletRole?.trim() ?? "";
  const walletSearch = params.walletSearch?.trim() ?? "";
  const walletBalanceRaw = params.walletBalance?.trim() ?? "";

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
  const withdrawalStatus =
    withdrawalStatusRaw === "PENDING" || withdrawalStatusRaw === "SUCCESS" || withdrawalStatusRaw === "FAILED"
      ? withdrawalStatusRaw
      : undefined;
  const walletBalance = walletBalanceRaw === "POSITIVE" || walletBalanceRaw === "ZERO" ? walletBalanceRaw : undefined;

  const [subscriptions, payments, transfers, wallets, withdrawals] = await Promise.all([
    getPlatformSubscriptions({ status: subscriptionStatus, limit: 15 }),
    getPlatformPayments({ status: paymentStatus, limit: 15 }),
    getPlatformTransfers({ status: transferStatus, limit: 15 }),
    getPlatformWallets({ role: walletRole, search: walletSearch, balance: walletBalance, limit: 30 }),
    getPlatformWalletWithdrawals({ status: withdrawalStatus, limit: 20 }),
  ]);

  return (
    <main className="space-y-6" dir="rtl">
      <header className="rounded-3xl border border-sky-300/20 bg-slate-900/55 p-6 backdrop-blur">
        <h1 className="text-2xl font-extrabold text-white">المتابعة المالية</h1>
        <p className="mt-2 text-sm text-slate-300">لوحة تجمع الاشتراكات والمدفوعات والتحويلات ومحافظ المستخدمين.</p>
      </header>

      <section className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
        <form className="grid gap-3 md:grid-cols-3" method="GET">
          <select className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40" defaultValue={subscriptionStatus ?? ""} name="subscriptionStatus">
            <option value="">كل الاشتراكات</option>
            <option value="ACTIVE">نشطة</option>
            <option value="INACTIVE">غير نشطة</option>
          </select>
          <select className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40" defaultValue={paymentStatus ?? ""} name="paymentStatus">
            <option value="">كل المدفوعات</option>
            <option value="PAID">مدفوع</option>
            <option value="PENDING">معلّق</option>
            <option value="OVERDUE">متأخر</option>
            <option value="PARTIAL">جزئي</option>
          </select>
          <div className="flex gap-3">
            <select className="w-full rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40" defaultValue={transferStatus ?? ""} name="transferStatus">
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

      <section className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">محافظ المستخدمين</h2>
            <p className="text-xs text-slate-400">آخر {wallets.items.length} من أصل {wallets.total}</p>
          </div>
          <form className="grid gap-2 sm:grid-cols-4" method="GET">
            <input className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40" defaultValue={walletSearch} name="walletSearch" placeholder="بحث بالاسم أو الهاتف" />
            <select className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40" defaultValue={walletRole} name="walletRole">
              <option value="">كل الأدوار</option>
              <option value="TEACHER">معلم</option>
              <option value="CENTER_ADMIN">سنتر</option>
              <option value="STUDENT">طالب</option>
              <option value="PARENT">ولي أمر</option>
            </select>
            <select className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40" defaultValue={walletBalance ?? ""} name="walletBalance">
              <option value="">كل الأرصدة</option>
              <option value="POSITIVE">رصيد موجب</option>
              <option value="ZERO">رصيد صفر</option>
            </select>
            <button className="rounded-xl border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25" type="submit">
              عرض المحافظ
            </button>
          </form>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {wallets.items.map((wallet) => (
            <article key={wallet.id} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{wallet.user.name}</p>
                  <p className="text-xs text-slate-400">{wallet.user.role} | {wallet.user.phone}</p>
                  <p className="text-xs text-slate-400">{wallet.tenant.name} / {wallet.tenant.slug}</p>
                </div>
                <p className="text-lg font-extrabold text-emerald-300">{wallet.balance.toLocaleString("en-US")} ج.م</p>
              </div>
              <form action={adjustUserWalletAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <input name="tenantId" type="hidden" value={wallet.tenantId} />
                <input name="userId" type="hidden" value={wallet.userId} />
                <select className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white" name="operation" defaultValue="CREDIT">
                  <option value="CREDIT">إضافة رصيد</option>
                  <option value="DEBIT">خصم رصيد</option>
                  <option value="PAYOUT">تسجيل سحب</option>
                </select>
                <select className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white" name="adminWithdrawalMethod" defaultValue="CASH">
                  <option value="CASH">سحب كاش</option>
                  <option value="ELECTRONIC_WALLET">محفظة إلكترونية</option>
                  <option value="INSTAPAY">InstaPay</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="OTHER">طريقة أخرى</option>
                </select>
                <input className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white" name="amount" placeholder="المبلغ" inputMode="numeric" />
                <input className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white" name="reason" placeholder="السبب" />
                <button className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white" type="submit">تنفيذ</button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">طلبات سحب المحافظ</h2>
            <p className="text-xs text-slate-400">آخر {withdrawals.items.length} من أصل {withdrawals.total}</p>
          </div>
          <form className="flex gap-2" method="GET">
            <select className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40" defaultValue={withdrawalStatus ?? ""} name="withdrawalStatus">
              <option value="">كل طلبات السحب</option>
              <option value="PENDING">معلقة</option>
              <option value="SUCCESS">ناجحة</option>
              <option value="FAILED">فاشلة</option>
            </select>
            <button className="rounded-xl border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25" type="submit">
              تطبيق
            </button>
          </form>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {withdrawals.items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{item.user.name}</p>
                  <p className="text-xs text-slate-400">{item.user.role} | {item.user.phone}</p>
                  <p className="text-xs text-slate-400">{item.tenant.name} / {item.tenant.slug}</p>
                </div>
                <p className="text-lg font-extrabold text-sky-300">{item.amount.toLocaleString("en-US")} ج.م</p>
              </div>
              <p className="mt-2 text-xs font-bold text-sky-200">
                {item.method}{item.adminMethod ? ` / ${item.adminMethod}` : ""} | {item.status}
              </p>
              <p className="text-xs text-slate-400">طلب: {new Date(item.requestedAt).toLocaleString("ar-EG")}</p>
              {item.processedAt ? <p className="text-xs text-slate-400">تنفيذ: {new Date(item.processedAt).toLocaleString("ar-EG")}</p> : null}
              {item.processedBy ? <p className="text-xs text-slate-400">بواسطة: {item.processedBy.name} | {item.processedBy.phone}</p> : null}
              {item.failureReason ? <p className="mt-1 text-xs text-rose-300">{item.failureReason}</p> : null}
            </article>
          ))}
        </div>
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
