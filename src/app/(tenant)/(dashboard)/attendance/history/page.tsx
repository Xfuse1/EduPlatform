import { requireTenant } from '@/lib/tenant'
import { db } from '@/lib/db'

// ── B-07: Attendance History Page ────────────────────────────────────────────

export default async function AttendanceHistoryPage() {
  const tenant = await requireTenant()

  const sessions = await db.session.findMany({
    where: { tenantId: tenant.id, status: 'COMPLETED' },
    include: {
      group: { select: { name: true, color: true } },
      _count: { select: { attendance: { where: { status: 'PRESENT' } } } },
    },
    orderBy: { date: 'desc' },
    take: 30,
  })

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">سجل الحضور</h1>

      {sessions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          لا يوجد سجل حضور بعد — ابدأ بتسجيل الحضور اليوم!
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session: any) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: session.group.color }}
                />
                <div>
                  <p className="font-medium">{session.group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.date).toLocaleDateString('ar-EG', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <span className="font-bold text-primary">
                {session._count.attendance} حاضر
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
