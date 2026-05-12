// ── AttendanceReport: بطاقات ملخص + قائمة حصص التقرير الشهري ────────────────

type ReportSession = {
  id: string
  date: Date | string
  group: { name: string; color: string | null }
  _count: { attendance: number }
}

interface Props {
  sessions: ReportSession[]
  totalSessions: number
  avgAttendance: number
}

export function AttendanceReport({ sessions, totalSessions, avgAttendance }: Props) {
  return (
    <div className="space-y-4">
      {/* ملخص الشهر */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 sm:text-3xl">
            {totalSessions}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            حصة هذا الشهر
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-3xl">
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
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="w-2 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: session.group.color ?? '#94a3b8' }}
                />
                <div className="min-w-0">
                  <p className="truncate text-start font-medium text-slate-900 dark:text-slate-100">
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
