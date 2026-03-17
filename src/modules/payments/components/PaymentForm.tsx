'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordPayment } from '@/modules/payments/actions'

// ── B-04.5: PaymentForm ──────────────────────────────────────────────────────

interface Student {
  id: string
  name: string
  gradeLevel: string | null
}

interface PaymentFormProps {
  students: Student[]
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'نقداً 💵' },
  { value: 'VODAFONE_CASH', label: 'فودافون كاش 📱' },
  { value: 'FAWRY', label: 'فوري 🏧' },
  { value: 'INSTAPAY', label: 'إنستاباي 📲' },
  { value: 'CARD', label: 'بطاقة بنكية 💳' },
] as const

/**
 * فورم تسجيل دفعة جديدة — بعد النجاح يعرض رقم الإيصال
 */
export function PaymentForm({ students }: PaymentFormProps) {
  const [isPending, startTransition] = useTransition()
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<string>('CASH')
  const router = useRouter()

  const currentMonth = new Date().toISOString().slice(0, 7)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedStudentId) {
      setError('برجاء اختيار الطالب')
      return
    }
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('studentId', selectedStudentId)
    formData.set('method', selectedMethod)

    startTransition(async () => {
      try {
        const result = await recordPayment(formData)
        if (result.success) {
          setReceiptNumber(result.data.receiptNumber)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التسجيل')
      }
    })
  }

  // شاشة النجاح
  if (receiptNumber) {
    return (
      <div className="text-center space-y-4 p-6">
        <span className="text-5xl block">✅</span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          تم تسجيل الدفعة بنجاح
        </h2>
        <p className="text-slate-500 dark:text-slate-400">رقم الإيصال:</p>
        <p className="font-mono font-bold text-lg bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
          {receiptNumber}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => setReceiptNumber(null)}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            تسجيل دفعة أخرى
          </button>
          <button
            type="button"
            onClick={() => router.push('/payments')}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
          >
            الرجوع للمصاريف
          </button>
        </div>
      </div>
    )
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500'
  const labelClass =
    'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* اختيار الطالب */}
      <div>
        <label htmlFor="studentId" className={labelClass}>
          الطالب *
        </label>
        <select
          id="studentId"
          className={inputClass}
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          required
        >
          <option value="">اختر الطالب</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.gradeLevel ? ` — ${s.gradeLevel}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* المبلغ */}
      <div>
        <label htmlFor="amount" className={labelClass}>
          المبلغ (جنيه) *
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="1"
          required
          placeholder="400"
          className={inputClass}
        />
      </div>

      {/* الشهر */}
      <div>
        <label htmlFor="month" className={labelClass}>
          الشهر *
        </label>
        <select
          id="month"
          name="month"
          required
          defaultValue={currentMonth}
          className={inputClass}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            return (
              <option key={value} value={value}>
                {d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}
              </option>
            )
          })}
        </select>
      </div>

      {/* طريقة الدفع */}
      <div>
        <label htmlFor="method" className={labelClass}>
          طريقة الدفع *
        </label>
        <select
          id="method"
          className={inputClass}
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* ملاحظات */}
      <div>
        <label htmlFor="notes" className={labelClass}>
          ملاحظات (اختياري)
        </label>
        <input
          id="notes"
          name="notes"
          placeholder="أي ملاحظات إضافية..."
          className={inputClass}
        />
      </div>

      {/* رسالة خطأ */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full h-12 text-lg font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white transition-colors"
        disabled={isPending || !selectedStudentId}
      >
        {isPending ? '⏳ جاري التسجيل...' : 'تسجيل الدفعة 💰'}
      </button>
    </form>
  )
}
