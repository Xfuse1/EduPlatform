import Link from 'next/link'
import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary, getPayments } from '@/modules/payments/queries'
import { RevenueCards } from '@/modules/payments/components/RevenueCards'
import { KashierResultBanner } from '@/modules/payments/components/KashierResultBanner'

// ── B-04: Payments Index Page ────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ kashier?: string }>
}

export default async function PaymentsPage({ searchParams }: Props) {
  const { kashier } = await searchParams
  const tenant = await requireTenant()
  const [summary, recentPayments] = await Promise.all([
    getRevenueSummary(tenant.id),
    getPayments(tenant.id),
  ])

  return (
    <div className="p-4 space-y-6">
      {/* بانر نتيجة Kashier — يظهر فقط لو المستخدم راجع من Checkout */}
      {kashier && <KashierResultBanner status={kashier} />}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          المصاريف
        </h1>
        <Link
          href="/payments/record"
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors"
        >
          تسجيل دفعة +
        </Link>
      </div>

      {/* بطاقات الملخص */}
      <RevenueCards summary={summary} />

      {/* آخر المدفوعات */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            آخر المدفوعات
          </h2>
          <Link
            href="/payments/overdue"
            className="text-sm text-rose-600 dark:text-rose-400 font-medium"
          >
            المتأخرون →
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">
            لا توجد مدفوعات بعد
          </p>
        ) : (
          <div className="space-y-2">
            {recentPayments.slice(0, 10).map((p: any) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {p.student?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.month} • {p.receiptNumber}
                  </p>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {p.amount.toLocaleString('ar-EG')} جنيه
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
