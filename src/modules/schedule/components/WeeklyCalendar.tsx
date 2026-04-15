import type { DayOfWeek } from '@/types'
import { formatTime12Hour, formatTimeRange12Hour } from '@/lib/utils'

type ScheduleEntry = {
  id: string
  groupId: string
  groupName: string
  subject: string
  gradeLevel: string
  day: DayOfWeek
  timeStart: string
  timeEnd: string
  room: string | null
  color: string
  studentCount: number
  maxCapacity: number
  hasConflict: boolean
  conflictGroupIds: string[]
}

type WeeklyCalendarProps = {
  schedule: {
    days: Record<DayOfWeek, ScheduleEntry[]>
    timeSlots: string[]
  }
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
}

const DAY_ORDER: DayOfWeek[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
]

const numberFormatter = new Intl.NumberFormat('ar-EG')

export default function WeeklyCalendar({ schedule }: WeeklyCalendarProps) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[110px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-slate-800">
            <div className="px-4 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">
              الوقت
            </div>

            {DAY_ORDER.map((day) => (
              <div
                key={day}
                className="border-s border-slate-200 px-4 py-4 text-center text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100"
              >
                {DAY_LABELS[day]}
              </div>
            ))}
          </div>

          {schedule.timeSlots.map((timeSlot) => (
            <div
              key={timeSlot}
              className="grid grid-cols-[110px_repeat(7,minmax(0,1fr))] border-b border-slate-100 last:border-b-0 dark:border-slate-900"
            >
              <div className="px-4 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {formatTime12Hour(timeSlot)}
              </div>

              {DAY_ORDER.map((day) => {
                const groupsAtTime = schedule.days[day].filter(
                  (entry) => entry.timeStart === timeSlot,
                )

                return (
                  <div
                    key={`${day}-${timeSlot}`}
                    className="min-h-28 border-s border-slate-100 px-3 py-3 dark:border-slate-900"
                  >
                    <div className="space-y-3">
                      {groupsAtTime.map((entry) => (
                        <article
                          key={entry.id}
                          className={`rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-900 ${
                            entry.hasConflict
                              ? 'border-rose-500 ring-1 ring-rose-200 dark:ring-rose-900/50'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                          style={{
                            borderTopWidth: '4px',
                            borderTopColor: entry.hasConflict
                              ? '#E11D48'
                              : entry.color,
                          }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-bold text-slate-950 dark:text-slate-100">
                                  {entry.groupName}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {entry.subject} - {entry.gradeLevel}
                                </p>
                              </div>

                              {entry.hasConflict ? (
                                <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                  تعارض
                                </span>
                              ) : null}
                            </div>

                            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                              <p>
                                {formatTimeRange12Hour(entry.timeStart, entry.timeEnd)}
                              </p>
                              <p>
                                {numberFormatter.format(entry.studentCount)} /{' '}
                                {numberFormatter.format(entry.maxCapacity)} طالب
                              </p>
                              <p>القاعة: {entry.room || 'غير محددة'}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
