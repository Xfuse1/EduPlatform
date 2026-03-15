import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ROUTES } from '@/config/routes'
import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import { getGroups } from '@/modules/groups/queries'
import { getStudents } from '@/modules/students/queries'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function TeacherDashboardPage() {
  const [tenant, user] = await Promise.all([requireTenant(), requireAuth()])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const [groups, students] = await Promise.all([
    getGroups(tenant.id),
    getStudents(tenant.id),
  ])

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] bg-gradient-to-l from-sky-800 via-sky-700 to-cyan-600 px-5 py-6 text-white shadow-lg md:px-8">
        <p className="text-sm text-sky-100">لوحة التحكم</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">{tenant.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50/90">
          متابعة سريعة لأهم مؤشرات المؤسسة الحالية مع اختصارات مباشرة للمجموعات
          والطلاب والجدول.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">المجموعات النشطة</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            {groups.length}
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الطلاب</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            {students.length}
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">اسم المستخدم</p>
          <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
            {user.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href={ROUTES.teacher.groups}
          className="rounded-[28px] border border-slate-200 bg-white p-5 text-start shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-sky-700 dark:hover:bg-sky-950/40"
        >
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            إدارة المجموعات
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            مراجعة المجموعات الحالية أو إضافة مجموعة جديدة.
          </p>
        </Link>

        <Link
          href={ROUTES.teacher.students}
          className="rounded-[28px] border border-slate-200 bg-white p-5 text-start shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-sky-700 dark:hover:bg-sky-950/40"
        >
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            إدارة الطلاب
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            البحث عن الطلاب، تعديل البيانات، واستيراد الملفات.
          </p>
        </Link>

        <Link
          href={ROUTES.teacher.schedule}
          className="rounded-[28px] border border-slate-200 bg-white p-5 text-start shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-sky-700 dark:hover:bg-sky-950/40"
        >
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            الجدول الأسبوعي
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            عرض المواعيد الحالية ومراجعة أي تعارضات في القاعات.
          </p>
        </Link>
      </div>
    </section>
  )
}
