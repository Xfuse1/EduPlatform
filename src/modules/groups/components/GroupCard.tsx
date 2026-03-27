import Link from 'next/link'

import type { DayOfWeek } from '@/types'

type GroupCardProps = {
  group: {
    id: string
    name: string
    subject: string
    gradeLevel: string
    days: string[]
    timeStart: string
    timeEnd: string
    maxCapacity: number
    monthlyFee: number
    color: string
    room: string | null
    studentCount: number
  }
}

const dayFormatter = new Intl.ListFormat('ar', {
  style: 'long',
  type: 'conjunction',
})

const numberFormatter = new Intl.NumberFormat('ar-EG')

const DAY_LABELS: Record<DayOfWeek, string> = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
}

function toArabicDigits(value: string) {
  return value.replace(/\d/g, (digit) => numberFormatter.format(Number(digit)))
}

function isDayOfWeek(day: string): day is DayOfWeek {
  return day in DAY_LABELS
}

function formatDays(days: string[]) {
  const normalizedDays = days.filter(isDayOfWeek)

  if (normalizedDays.length === 0) {
    return 'غير محدد'
  }

  return dayFormatter.format(normalizedDays.map((day) => DAY_LABELS[day]))
}

export default function GroupCard({ group }: GroupCardProps) {
  const occupancyText = `${numberFormatter.format(group.studentCount)} / ${numberFormatter.format(group.maxCapacity)}`
  const feeText = `${numberFormatter.format(group.monthlyFee)} ج.م`
  const timeText = `${toArabicDigits(group.timeStart)} - ${toArabicDigits(group.timeEnd)}`

  return (
    <article
      className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
      style={{ borderTopWidth: '5px', borderTopColor: group.color }}
    >
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-950 dark:text-white">
              {group.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {group.gradeLevel}
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900 dark:bg-sky-900/40 dark:text-sky-100">
            {group.subject}
          </span>
        </div>

        <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">الأيام</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {formatDays(group.days)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">الوقت</p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {timeText}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                السعة
              </p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {occupancyText}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                المصاريف الشهرية
              </p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {feeText}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                القاعة
              </p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {group.room || 'غير محددة'}
              </p>
            </div>
          </div>
        </div>

        <Link
          href={`/teacher/groups/${group.id}`}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-100"
        >
          عرض المجموعة
        </Link>
      </div>
    </article>
  )
}
