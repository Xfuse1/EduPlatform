import { requireAuth } from '@/lib/auth'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getAttendanceReport } from '@/modules/attendance/queries'

// ── B-07: Attendance Reports Page ────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ month?: string }>
}

export default async function AttendanceReportsPage({ searchParams }: Props) {
  const { month: monthParam } = await searchParams
  const tenant = await requireTenant()
  const user = await requireAuth()
  const teacherScopeUserId = getTeacherScopeUserId(tenant, user)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const month = monthParam ?? currentMonth

  // نوع نتيجة getAttendanceReport (مؤقتاً حتى يتم توليد Prisma client)
  type ReportSession = {
    id: string
    date: Date | string
    group: { name: string; color: string }
    _count: { attendance: number }
  }

  const sessions = (await getAttendanceReport(tenant.id, month, teacherScopeUserId ?? undefined)) as ReportSession[]

  const totalSessions = sessions.length
  const totalPresent = sessions.reduce(
    (sum: number, s: ReportSession) => sum + s._count.attendance,
    0,
  )
  const avgAttendance =
    totalSessions === 0 ? 0 : Math.round(totalPresent / totalSessions)

  // آخر 6 شهور للتنقل السريع
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
    return { value, label }
  })

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        تقرير الحضور
      </h1>

      {/* تنقل بين الشهور */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {months.map((m) => (
          <a
            key={m.value}
            href={`?month=${m.value}`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              m.value === month
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-900/20'
            }`}
          >
            {m.label}
          </a>
        ))}
      </div>

      {/* ملخص الشهر */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">
            {totalSessions}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            حصة هذا الشهر
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {avgAttendance}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            متوسط حضور / حصة
          </p>
        </div>
      </div>

      {/* قائمة الحصص */}
      {sessions.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 py-8">
          لا توجد حصص مكتملة في هذا الشهر
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: session.group.color }}
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-start">
                    {session.group.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-start">
                    {new Date(session.date).toLocaleDateString('ar-EG', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
              </div>
              <span className="font-bold text-sky-600 dark:text-sky-400 shrink-0">
                {session._count.attendance} حاضر
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

