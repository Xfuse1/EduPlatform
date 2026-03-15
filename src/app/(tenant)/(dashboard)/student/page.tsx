import Link from 'next/link'
import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { ROUTES } from '@/config/routes'
import { requireAuth } from '@/lib/auth'

export default async function StudentDashboardPage() {
  const user = await requireAuth()

  if (user.role !== 'STUDENT') {
    notFound()
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] bg-gradient-to-l from-sky-800 via-sky-700 to-cyan-600 px-5 py-6 text-white shadow-lg md:px-8">
        <p className="text-sm text-sky-100">حساب الطالب</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">{user.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50/90">
          ستظهر هنا تفاصيل الجدول والمتابعة الشخصية للطالب مع اكتمال وحدات
          الحضور والمدفوعات الخاصة بالطالب.
        </p>
      </div>

      <EmptyState
        title="لوحة الطالب قيد الاستكمال"
        message="تم تجهيز مسار الطالب وتأمينه، وسيظهر المحتوى التفصيلي بمجرد اكتمال وحدات الطالب المرتبطة."
        action={
          <Link
            href={ROUTES.student.schedule}
            className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
          >
            عرض الجدول
          </Link>
        }
      />
    </section>
  )
}
