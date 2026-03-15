import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ROUTES } from '@/config/routes'
import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import { getGroups } from '@/modules/groups/queries'
import StudentForm from '@/modules/students/components/StudentForm'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function NewStudentPage() {
  const [tenant, user] = await Promise.all([requireTenant(), requireAuth()])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const groups = await getGroups(tenant.id)

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[32px] border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:px-8">
        <Link
          href={ROUTES.teacher.students}
          className="inline-flex w-fit items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          الرجوع إلى الطلاب
        </Link>

        <div className="space-y-2">
          <p className="text-sm text-sky-700 dark:text-sky-300">{tenant.name}</p>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
            إضافة طالب جديد
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            أدخل البيانات الأساسية وحدد المجموعة أو المجموعات في نفس العملية.
          </p>
        </div>
      </div>

      <StudentForm mode="create" availableGroups={groups} />
    </section>
  )
}
