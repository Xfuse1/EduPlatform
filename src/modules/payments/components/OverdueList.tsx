'use client'
import { useState, useTransition } from 'react'
import { sendPaymentReminder } from '@/modules/payments/actions'

// ── B-04: OverdueList ────────────────────────────────────────────────────────

interface OverduePayment {
  id: string
  amount: number
  month: string
  status: string
  student: {
    id: string
    name: string
    parentPhone: string | null
    gradeLevel: string | null
  } | null
}

interface OverdueListProps {
  payments: OverduePayment[]
}

/**
 * قائمة المتأخرين مع إرسال تذكيرات
 */
export function OverdueList({ payments }: OverdueListProps) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const sendReminder = (studentId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        await sendPaymentReminder([studentId])
        setSent((prev) => [...prev, studentId])
      } catch {
        setError('فشل إرسال التذكير — حاول مرة أخرى')
      }
    })
  }

  const sendAll = () => {
    const ids = payments
      .map((p) => p.student?.id)
      .filter((id): id is string => id != null)
    setError(null)
    startTransition(async () => {
      try {
        await sendPaymentReminder(ids)
        setSent(ids)
      } catch {
        setError('فشل إرسال التذكيرات — حاول مرة أخرى')
      }
    })
  }

  if (payments.length === 0) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400 py-8">
        🎉 لا يوجد متأخرون في السداد!
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* زر إرسال للكل */}
      <button
        type="button"
        onClick={sendAll}
        disabled={isPending || sent.length === payments.length}
        className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        📨 إرسال تذكير للكل ({payments.length})
      </button>

      {/* رسالة خطأ */}
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400 text-center">
          {error}
        </p>
      )}

      {/* قائمة الطلاب */}
      {payments.map((p) => (
        <div
          key={p.id}
          className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {p.student?.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {p.student?.gradeLevel} • {p.month}
              </p>
              {p.student?.parentPhone && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {p.student.parentPhone}
                </p>
              )}
            </div>
            <div className="text-end">
              <p className="font-bold text-rose-600 dark:text-rose-400">
                {p.amount.toLocaleString('ar-EG')} جنيه
              </p>
              {p.student && (
                <button
                  type="button"
                  className="mt-1 text-xs text-sky-600 dark:text-sky-400 hover:underline disabled:opacity-50"
                  disabled={isPending || sent.includes(p.student.id)}
                  onClick={() => p.student && sendReminder(p.student.id)}
                >
                  {sent.includes(p.student.id)
                    ? '✅ تم الإرسال'
                    : 'إرسال تذكير'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
