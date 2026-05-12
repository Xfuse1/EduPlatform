import { AdminFinanceSelect } from "@/modules/admin/components/AdminFinanceSelect";
import { AdminWalletAdjustmentForm } from "@/modules/admin/components/AdminWalletAdjustmentForm";
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

const financeInputClass =
  "h-11 w-full rounded-xl border border-sky-300/20 bg-slate-950/80 px-3 text-sm font-semibold text-slate-100 placeholder:text-slate-500 outline-none transition [color-scheme:dark] hover:border-sky-300/40 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/15";

const subscriptionStatusOptions = [
  { value: "", label: "كل الاشتراكات" },
  { value: "ACTIVE", label: "نشطة" },
  { value: "INACTIVE", label: "غير نشطة" },
];

const paymentStatusOptions = [
  { value: "", label: "كل المدفوعات" },
  { value: "PAID", label: "مدفوع" },
  { value: "PENDING", label: "معلّق" },
  { value: "OVERDUE", label: "متأخر" },
  { value: "PARTIAL", label: "جزئي" },
];

const transferStatusOptions = [
  { value: "", label: "كل التحويلات" },
  { value: "SUCCESS", label: "ناجحة" },
  { value: "PENDING", label: "معلّقة" },
  { value: "RETRY", label: "إعادة محاولة" },
  { value: "FAILED", label: "فاشلة" },
];

const walletRoleOptions = [
  { value: "", label: "كل الأدوار" },
  { value: "TEACHER", label: "معلم" },
  { value: "CENTER_ADMIN", label: "سنتر" },
  { value: "STUDENT", label: "طالب" },
  { value: "PARENT", label: "ولي أمر" },
];

const walletBalanceOptions = [
  { value: "", label: "كل الأرصدة" },
  { value: "POSITIVE", label: "رصيد موجب" },
  { value: "ZERO", label: "رصيد صفر" },
];

const withdrawalStatusOptions = [
  { value: "", label: "كل طلبات السحب" },
  { value: "PENDING", label: "معلقة" },
  { value: "SUCCESS", label: "ناجحة" },
  { value: "FAILED", label: "فاشلة" },
];

function getWalletRoleLabel(role: string) {
  switch (role) {
    case "TEACHER":
      return "معلم";
    case "CENTER_ADMIN":
      return "سنتر";
    case "ADMIN":
      return "مدير";
    case "MANAGER":
      return "مشرف";
    case "STUDENT":
      return "طالب";
    case "PARENT":
      return "ولي أمر";
    case "ASSISTANT":
      return "مساعد";
    default:
      return role;
  }
}

export default async function AdminFinancePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const subscriptionStatusRaw = params.subscriptionStatus?.trim() ?? "";
  const paymentStatusRaw = params.paymentStatus?.trim() ?? "";
  const transferStatusRaw = params.transferStatus?.trim() ?? "";
  const withdrawalStatusRaw = params.withdrawalStatus?.trim() ?? "";
  const walletRoleRaw = params.walletRole?.trim() ?? "";
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
  const walletRole = walletRoleOptions.some((option) => option.value === walletRoleRaw) ? walletRoleRaw : "";
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
      <header className="rounded-2xl border border-sky-300/20 bg-slate-900/55 p-4 backdrop-blur sm:rounded-3xl sm:p-6">
        <h1 className="text-2xl font-extrabold text-white">المتابعة المالية</h1>
        <p className="mt-2 text-sm text-slate-300">لوحة تجمع الاشتراكات والمدفوعات والتحويلات ومحافظ المستخدمين.</p>
      </header>

      <section className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:rounded-3xl">
        <form className="grid gap-3 md:grid-cols-3" method="GET">
          <AdminFinanceSelect defaultValue={subscriptionStatus ?? ""} name="subscriptionStatus" options={subscriptionStatusOptions} />
          <AdminFinanceSelect defaultValue={paymentStatus ?? ""} name="paymentStatus" options={paymentStatusOptions} />
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <AdminFinanceSelect defaultValue={transferStatus ?? ""} name="transferStatus" options={transferStatusOptions} />
            <button className="rounded-xl border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25" type="submit">
              تطبيق
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:rounded-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">محافظ المستخدمين</h2>
            <p className="text-xs text-slate-400">آخر {wallets.items.length} من أصل {wallets.total}</p>
          </div>
          <form className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-4" method="GET">
            <input className={financeInputClass} defaultValue={walletSearch} name="walletSearch" placeholder="بحث بالاسم أو الهاتف" />
            <AdminFinanceSelect defaultValue={walletRole} name="walletRole" options={walletRoleOptions} />
            <AdminFinanceSelect defaultValue={walletBalance ?? ""} name="walletBalance" options={walletBalanceOptions} />
            <button className="rounded-xl border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25" type="submit">
              عرض المحافظ
            </button>
          </form>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {wallets.items.map((wallet) => (
            <article key={wallet.id} className="overflow-visible rounded-2xl border border-sky-300/15 bg-slate-950/60 p-4 text-sm shadow-[0_16px_40px_rgba(2,8,23,0.24)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-base font-extrabold text-white">{wallet.user.name}</p>
                  <div className="flex max-w-full flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 font-bold text-cyan-100">
                      {getWalletRoleLabel(wallet.user.role)}
                    </span>
                    <span className="min-w-0 truncate text-slate-400">{wallet.user.phone}</span>
                  </div>
                  <p className="truncate text-xs text-slate-500">{wallet.tenant.name} / {wallet.tenant.slug}</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-start sm:shrink-0">
                  <p className="text-[11px] font-bold text-emerald-100/80">رصيد المحفظة</p>
                  <p className="break-words text-lg font-extrabold text-emerald-300 sm:text-xl">{wallet.balance.toLocaleString("en-US")} ج.م</p>
                </div>
              </div>
              <AdminWalletAdjustmentForm wallet={wallet} />
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:rounded-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">طلبات سحب المحافظ</h2>
            <p className="text-xs text-slate-400">آخر {withdrawals.items.length} من أصل {withdrawals.total}</p>
          </div>
          <form className="flex w-full flex-col gap-2 min-[420px]:w-auto min-[420px]:flex-row" method="GET">
            <AdminFinanceSelect defaultValue={withdrawalStatus ?? ""} name="withdrawalStatus" options={withdrawalStatusOptions} />
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

      <section className="grid gap-4 xl:grid-cols-3 sm:gap-6">
        <div className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:rounded-3xl">
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

        <div className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:rounded-3xl">
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

        <div className="rounded-2xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur sm:rounded-3xl">
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
