import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

export default async function ParentDashboardPage() {
  const user = await requireAuth()

  if (user.role !== 'PARENT') {
    notFound()
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] bg-gradient-to-l from-sky-800 via-sky-700 to-cyan-600 px-5 py-6 text-white shadow-lg md:px-8">
        <p className="text-sm text-sky-100">حساب ولي الأمر</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">{user.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50/90">
          ستظهر هنا بيانات الأبناء والمتابعة الأكاديمية بمجرد اكتمال وحدة ولي
          الأمر.
        </p>
      </div>

      <EmptyState
        title="لا توجد بيانات أبناء معروضة بعد"
        message="تم تجهيز مسار ولي الأمر وتأمينه، وسيظهر ربط الأبناء والملفات المرتبطة بعد استكمال الوحدة الخاصة بهم."
      />
    </section>
  )
}
