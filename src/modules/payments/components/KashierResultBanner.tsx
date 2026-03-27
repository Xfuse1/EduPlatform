'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ── KashierResultBanner ───────────────────────────────────────────────────────
// يظهر بعد عودة المستخدم من Kashier Checkout
// يختفي تلقائياً بعد 6 ثواني ويحذف ?kashier= من الـ URL

interface Props {
  status: string
}

const CONFIGS: Record<string, { icon: string; title: string; message: string; bg: string; border: string; text: string }> = {
  success: {
    icon: '✅',
    title: 'تمت عملية الدفع بنجاح',
    message: 'سيظهر الإيصال في القائمة أدناه خلال لحظات',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  failed: {
    icon: '❌',
    title: 'فشلت عملية الدفع',
    message: 'لم تُخصم أي مبالغ — يمكنك المحاولة مجدداً',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-300 dark:border-rose-700',
    text: 'text-rose-800 dark:text-rose-200',
  },
  pending: {
    icon: '⏳',
    title: 'العملية قيد المعالجة',
    message: 'سيتم تحديث حالة الدفع تلقائياً عند التأكيد من البنك',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
  },
}

export function KashierResultBanner({ status }: Props) {
  const [visible, setVisible] = useState(true)
  const router = useRouter()
  const config = CONFIGS[status] ?? CONFIGS.pending

  // حذف ?kashier= من الـ URL بعد الظهور — بدون reload
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('kashier')
    window.history.replaceState({}, '', url.toString())
  }, [])

  // اختفاء تلقائي بعد 6 ثواني
  useEffect(() => {
    if (status === 'success' || status === 'pending') {
      const timer = setTimeout(() => setVisible(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [status])

  // إعادة تحميل الصفحة بعد نجاح الدفع لتحديث قائمة المدفوعات
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => router.refresh(), 3000)
      return () => clearTimeout(timer)
    }
  }, [status, router])

  if (!visible) return null

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg} ${config.border} ${config.text}`}
      role="alert"
    >
      <span className="text-2xl shrink-0">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{config.title}</p>
        <p className="text-sm opacity-80 mt-0.5">{config.message}</p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
        aria-label="إغلاق"
      >
        ×
      </button>
    </div>
  )
}
