import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'

// ── B-04: RevenueCards ───────────────────────────────────────────────────────

interface RevenueSummary {
  collected: number
  outstanding: number
  total: number
  collectionRate: number
  comparedToLastMonth: number
}

interface RevenueCardsProps {
  summary: RevenueSummary
}

/**
 * بطاقات ملخص الإيرادات الشهرية
 */
export function RevenueCards({ summary }: RevenueCardsProps) {
  const isTrendPositive = summary.comparedToLastMonth >= 0

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* المحصّل */}
      <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-start justify-between">
          <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
          {isTrendPositive ? (
            <TrendingUp className="text-emerald-400 w-4 h-4" />
          ) : (
            <TrendingDown className="text-rose-400 w-4 h-4" />
          )}
        </div>
        <p className="text-2xl font-bold mt-2 text-slate-900 dark:text-slate-100">
          {summary.collected.toLocaleString('ar-EG')}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">جنيه محصّل</p>
        <p
          className={`text-xs mt-1 font-medium ${
            isTrendPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {isTrendPositive ? '+' : ''}
          {summary.comparedToLastMonth}% عن الشهر الماضي
        </p>
      </div>

      {/* المتأخر */}
      <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
        <AlertCircle className="text-rose-500 w-5 h-5" />
        <p className="text-2xl font-bold mt-2 text-slate-900 dark:text-slate-100">
          {summary.outstanding.toLocaleString('ar-EG')}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">جنيه متأخر</p>
      </div>

      {/* نسبة التحصيل */}
      <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm col-span-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            نسبة التحصيل
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.collectionRate}%
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2">
          <div
            className="bg-sky-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${summary.collectionRate}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1 text-end">
          إجمالي: {summary.total.toLocaleString('ar-EG')} جنيه
        </p>
      </div>
    </div>
  )
}
