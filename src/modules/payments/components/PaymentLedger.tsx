'use client'

// ── PaymentLedger — سجل مدفوعات الطالب ──────────────────────────────────────

// Local type — يتحول تلقائياً لنوع Prisma بعد `prisma generate`
type LedgerPayment = {
  id: string
  month: string
  amount: number
  status: string
  method: string
  receiptNumber: string | null
  paidAt: Date | null
}

interface PaymentLedgerProps {
  payments: LedgerPayment[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PAID: { label: 'مدفوع', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  PARTIAL: { label: 'جزئي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  PENDING: { label: 'معلق', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  OVERDUE: { label: 'متأخر', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'نقداً',
  VODAFONE_CASH: 'فودافون كاش',
  FAWRY: 'فوري',
  INSTAPAY: 'إنستاباي',
  CARD: 'بطاقة بنكية',
  KASHIER: 'Kashier أونلاين',
}

export function PaymentLedger({ payments }: PaymentLedgerProps) {
  if (payments.length === 0) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400 py-8">
        لا توجد سجلات دفع بعد
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {payments.map((p) => {
        const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.PENDING
        return (
          <div
            key={p.id}
            className="flex justify-between items-start p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {p.month}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {METHOD_LABELS[p.method] ?? p.method}
              </p>
              {p.receiptNumber && (
                <p className="text-xs font-mono text-slate-400">{p.receiptNumber}</p>
              )}
            </div>
            <div className="text-end space-y-1">
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {p.amount.toLocaleString('ar-EG')} ج
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                {s.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

