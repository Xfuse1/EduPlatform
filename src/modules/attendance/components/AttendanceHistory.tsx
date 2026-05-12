// ── AttendanceHistory: عرض سجل الحصص المكتملة ───────────────────────────────

type HistorySession = {
  id: string
  date: Date | string
  group: { name: string; color: string | null }
  _count: { attendance: number }
}

interface Props {
  sessions: HistorySession[]
}

export function AttendanceHistory({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        لا يوجد سجل حضور بعد — ابدأ بتسجيل الحضور اليوم!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex flex-col gap-3 rounded-lg border bg-white p-3 dark:bg-slate-900 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="w-3 h-8 rounded-full shrink-0"
              style={{ backgroundColor: session.group.color ?? '#94a3b8' }}
            />
            <div className="min-w-0">
              <p className="truncate text-start font-medium">{session.group.name}</p>
              <p className="text-xs text-muted-foreground text-start">
                {new Date(session.date).toLocaleDateString('ar-EG', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <span className="font-bold text-primary shrink-0">
            {session._count.attendance} حاضر
          </span>
        </div>
      ))}
    </div>
  )
}
