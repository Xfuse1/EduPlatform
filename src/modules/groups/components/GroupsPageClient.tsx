import Link from 'next/link'
import { CalendarDays, Pencil, Plus, Users } from 'lucide-react'

import { ROUTES } from '@/config/routes'
import { formatCapacity, formatCurrency, toArabicDigits } from '@/lib/utils'
import { formatGroupScheduleEntry, type GroupScheduleInput } from '@/modules/groups/schedule'

type GroupItem = {
  id: string
  name: string
  subject: string
  gradeLevel: string
  monthlyFee: number
  maxCapacity: number
  enrolledCount: number
  color: string
  schedule: GroupScheduleInput[]
}

export function GroupsPageClient({ initialGroups }: { initialGroups: GroupItem[] }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/70 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">المجموعات</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            اعرض المجموعات الحالية وأنشئ مجموعات جديدة بمواعيد أسبوعية متعددة.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <Link
            href={`${ROUTES.teacher.groups}/new`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 sm:w-auto dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" />
            إنشاء مجموعة جديدة
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            استخدم الفورم الكامل لإضافة عدد الحصص الأسبوعية ومواعيد كل حصة بدقة.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {initialGroups.map((group) => {
          const progress = Math.round((group.enrolledCount / group.maxCapacity) * 100)

          return (
            <article
              key={group.id}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="h-1.5" style={{ backgroundColor: group.color }} />

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{group.name}</h2>
                    <p className="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: group.color }}>
                      {group.subject}
                    </p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{group.gradeLevel}</p>
                  </div>
                  <p className="text-sm font-bold text-primary dark:text-sky-300">{formatCurrency(group.monthlyFee)}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <CalendarDays className="h-4 w-4" />
                    مواعيد المجموعة
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {group.schedule.map((entry, index) => (
                      <p key={`${group.id}-schedule-${index}`} className="rounded-xl bg-white px-3 py-2 dark:bg-slate-950">
                        {formatGroupScheduleEntry(entry)}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      عدد الطلاب
                    </span>
                    <span dir="ltr">{formatCapacity(group.enrolledCount, group.maxCapacity)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-600 transition-[width] dark:bg-sky-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    المتبقي <span dir="ltr">{toArabicDigits(group.maxCapacity - group.enrolledCount)}</span> مقعد
                  </p>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`${ROUTES.teacher.groups}/${group.id}`}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    عرض المجموعة
                  </Link>
                  <Link
                    href={`${ROUTES.teacher.groups}/${group.id}/edit`}
                    className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
