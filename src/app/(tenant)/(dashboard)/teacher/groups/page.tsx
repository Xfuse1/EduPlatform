import Link from 'next/link'
import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { ROUTES } from '@/config/routes'
import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import GroupList from '@/modules/groups/components/GroupList'
import { getGroups } from '@/modules/groups/queries'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function TeacherGroupsPage() {
  const [tenant, user] = await Promise.all([requireTenant(), requireAuth()])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const groups = await getGroups(tenant.id)

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] bg-gradient-to-l from-sky-800 via-sky-700 to-cyan-600 px-5 py-6 text-white shadow-lg md:flex-row md:items-center md:justify-between md:px-8">
        <div className="space-y-2">
          <p className="text-sm text-sky-100">إدارة المجموعات التعليمية</p>
          <h1 className="text-2xl font-bold md:text-3xl">مجموعات {tenant.name}</h1>
          <p className="max-w-2xl text-sm leading-6 text-sky-50/90">
            راجع المجموعات النشطة، السعة الحالية، ومواعيد الحصص بسرعة من شاشة واحدة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
            <span className="block text-xs text-sky-100">إجمالي المجموعات النشطة</span>
            <span className="mt-1 block text-lg font-bold">
              {new Intl.NumberFormat('ar-EG').format(groups.length)}
            </span>
          </div>

          <Link
            href={ROUTES.teacher.newGroup}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-50"
          >
            إنشاء مجموعة جديدة
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="لا توجد مجموعات بعد"
          message="ابدأ بإنشاء أول مجموعة لإضافة المواعيد وربط الطلاب بها ثم تتبع الحضور والمصاريف بسهولة."
          action={
            <Link
              href={ROUTES.teacher.newGroup}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
            >
              إنشاء مجموعة جديدة
            </Link>
          }
        />
      ) : (
        <GroupList groups={groups} />
      )}
    </section>
  )
}
