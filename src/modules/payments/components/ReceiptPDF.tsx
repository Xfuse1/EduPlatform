'use client'
// ── ReceiptPDF — إيصال قابل للطباعة ─────────────────────────────────────────
// استخدم Ctrl+P أو زر الطباعة لطباعته كـ PDF

interface ReceiptData {
  receiptNumber: string
  studentName: string
  amount: number
  month: string
  method: string
  paidAt: Date | string | null
  tenantName: string
  recordedBy?: string | null
  notes?: string | null
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'نقداً',
  VODAFONE_CASH: 'فودافون كاش',
  FAWRY: 'فوري',
  INSTAPAY: 'إنستاباي',
  CARD: 'بطاقة بنكية',
  KASHIER: 'Kashier أونلاين',
}

export function ReceiptPDF({ receipt }: { receipt: ReceiptData }) {
  const dateStr = receipt.paidAt
    ? new Date(receipt.paidAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  const rows: [string, string][] = [
    ['الطالب', receipt.studentName],
    ['الشهر', receipt.month],
    ['المبلغ', `${receipt.amount.toLocaleString('ar-EG')} جنيه مصري`],
    ['طريقة الدفع', METHOD_LABELS[receipt.method] ?? receipt.method],
    ['تاريخ الدفع', dateStr],
    ...(receipt.recordedBy ? [['سُجّل بواسطة', receipt.recordedBy] as [string, string]] : []),
    ...(receipt.notes ? [['ملاحظات', receipt.notes] as [string, string]] : []),
  ]

  return (
    <div
      className="max-w-sm mx-auto p-6 border-2 border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-900 space-y-4 print:border-black print:rounded-none print:shadow-none"
      dir="rtl"
    >
      {/* Header */}
      <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          إيصال دفع
        </p>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
          {receipt.tenantName}
        </h2>
        <p className="font-mono text-sm text-slate-500 dark:text-slate-400 mt-1">
          {receipt.receiptNumber}
        </p>
      </div>

      {/* بيانات الدفعة */}
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 text-end">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Footer */}
      <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-4 text-center">
        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
          {receipt.amount.toLocaleString('ar-EG')} ج.م
        </p>
        <p className="text-xs text-slate-400 mt-2">شكراً لكم — {receipt.tenantName}</p>
      </div>

      {/* زر الطباعة — يختفي عند الطباعة */}
      <button
        type="button"
        onClick={() => window.print()}
        className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors print:hidden"
      >
        🖨️ طباعة الإيصال
      </button>
    </div>
  )
}

