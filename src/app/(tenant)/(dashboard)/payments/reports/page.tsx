import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary } from '@/modules/payments/queries'

// ── B-08: Payment Reports Page ───────────────────────────────────────────────

export default async function PaymentReportsPage() {
  const tenant = await requireTenant()

  // اجمع آخر 6 شهور
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const summaries = await Promise.all(
    months.map((month) =>
      getRevenueSummary(tenant.id, month).then((s) => ({ month, ...s })),
    ),
  )

  const maxCollected = Math.max(...summaries.map((s) => s.collected), 1)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">تقرير الإيرادات</h1>
      <p className="text-sm text-muted-foreground">آخر 6 شهور</p>

      <div className="space-y-3">
        {summaries.map((s) => (
          <div key={s.month} className="p-4 border rounded-xl">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">{s.month}</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {s.collected.toLocaleString('ar-EG')} جنيه
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>متأخر: {s.outstanding.toLocaleString('ar-EG')} جنيه</span>
              <span>نسبة التحصيل: {s.collectionRate}%</span>
            </div>
            {/* شريط التحصيل */}
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${s.collectionRate}%` }}
              />
            </div>
            {/* شريط المقارنة النسبية بين الشهور */}
            {s.collected > 0 && (
              <div className="w-full bg-green-100 dark:bg-green-900/20 rounded-full h-1 mt-1">
                <div
                  className="bg-green-500 h-1 rounded-full"
                  style={{ width: `${Math.round((s.collected / maxCollected) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
