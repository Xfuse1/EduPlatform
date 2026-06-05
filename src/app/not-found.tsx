import Link from 'next/link'

import EmptyState from '@/components/shared/EmptyState'

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950"
    >
      <div className="w-full max-w-md">
        <EmptyState
          title="الصفحة غير موجودة"
          message="عذرًا، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها."
          action={
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              العودة للصفحة الرئيسية
            </Link>
          }
        />
      </div>
    </div>
  )
}
