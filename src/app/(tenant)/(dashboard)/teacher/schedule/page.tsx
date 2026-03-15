import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import WeeklyCalendar from '@/modules/schedule/components/WeeklyCalendar'
import { getWeeklySchedule } from '@/modules/schedule/queries'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function TeacherSchedulePage() {
  const [tenant, user] = await Promise.all([requireTenant(), requireAuth()])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const schedule = await getWeeklySchedule(tenant.id)
  const conflictCount = Object.values(schedule.days)
    .flat()
    .filter((entry) => entry.hasConflict).length

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] bg-gradient-to-l from-sky-800 via-sky-700 to-cyan-600 px-5 py-6 text-white shadow-lg md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-sky-100">الجدول الأسبوعي</p>
            <h1 className="text-2xl font-bold md:text-3xl">جدول {tenant.name}</h1>
            <p className="max-w-2xl text-sm leading-6 text-sky-50/90">
              عرض أسبوعي للمجموعات حسب اليوم والوقت، مع إبراز أي تعارضات في المواعيد.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-xs text-sky-100">إجمالي الحصص المجدولة</p>
              <p className="mt-1 text-lg font-bold">
                {new Intl.NumberFormat('ar-EG').format(
                  Object.values(schedule.days).flat().length,
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-xs text-sky-100">التعارضات الحالية</p>
              <p className="mt-1 text-lg font-bold">
                {new Intl.NumberFormat('ar-EG').format(conflictCount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {schedule.timeSlots.length === 0 ? (
        <EmptyState
          title="لا يوجد جدول بعد"
          message="أنشئ مجموعات وأضف لها الأيام والأوقات لتظهر في التقويم الأسبوعي هنا."
        />
      ) : (
        <WeeklyCalendar schedule={schedule} />
      )}
    </section>
  )
}
