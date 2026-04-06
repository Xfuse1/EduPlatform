import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ROUTES } from '@/config/routes'
import { requireAuth } from '@/lib/auth'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import GroupForm from '@/modules/groups/components/GroupForm'
import { parseStoredGroupSchedule } from '@/modules/groups/schedule'
import { getGroupById } from '@/modules/groups/queries'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

type EditGroupPageProps = {
  params: Promise<{
    groupId: string
  }>
}

export default async function EditGroupPage({ params }: EditGroupPageProps) {
  const [{ groupId }, tenant, user] = await Promise.all([
    params,
    requireTenant(),
    requireAuth(),
  ])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
  const group = await getGroupById(tenant.id, groupId, teacherScopeUserId ?? undefined)

  if (!group) {
    notFound()
  }

  const schedule = parseStoredGroupSchedule(group.schedule, {
    days: group.days,
    timeStart: group.timeStart,
    timeEnd: group.timeEnd,
  })

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[32px] border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:px-8">
        <Link
          href={`${ROUTES.teacher.groups}/${group.id}`}
          className="inline-flex w-fit items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          الرجوع إلى تفاصيل المجموعة
        </Link>

        <div className="space-y-2">
          <p className="text-sm text-sky-700 dark:text-sky-300">{tenant.name}</p>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
            تعديل {group.name}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            حدّث المواعيد وعدد الحصص والسعة واللون والبيانات الأساسية للمجموعة.
          </p>
        </div>
      </div>

      <GroupForm
        mode="edit"
        groupId={group.id}
        redirectTo={`${ROUTES.teacher.groups}/${group.id}`}
        initialValues={{
          name: group.name,
          subject: group.subject,
          gradeLevel: group.gradeLevel,
          schedule,
          room: group.room ?? undefined,
          maxCapacity: group.maxCapacity,
          monthlyFee: group.monthlyFee,
          color: group.color,
        }}
      />
    </section>
  )
}
