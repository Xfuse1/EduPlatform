'use client'

type TeacherSectionErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TeacherSectionError({
  error,
  reset,
}: TeacherSectionErrorProps) {
  return (
    <section className="rounded-[32px] border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/60 dark:bg-slate-950 md:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
          حدث خطأ غير متوقع
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
          تعذر تحميل الصفحة الحالية
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
          {error.message || 'حاول إعادة المحاولة، وإذا استمرت المشكلة راجع البيانات المدخلة أو العملية الأخيرة.'}
        </p>

        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    </section>
  )
}
