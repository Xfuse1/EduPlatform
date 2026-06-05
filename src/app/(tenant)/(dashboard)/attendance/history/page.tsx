import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { db } from '@/lib/db'
import { AttendanceHistory } from '@/modules/attendance/components/AttendanceHistory'

// ── B-07: Attendance History Page ────────────────────────────────────────────

type HistorySession = {
  id: string
  date: Date
  group: { name: string; color: string | null }
  _count: { attendance: number }
}

export default async function AttendanceHistoryPage() {
  const tenant = await requireTenant()
  const user = await requireAuth()
  const teacherScopeUserId = getTeacherScopeUserId(tenant, user)

  const rows = await db.session.findMany({
    where: {
      tenantId: tenant.id,
      status: 'COMPLETED',
      ...(teacherScopeUserId
        ? {
            group: {
              teacherId: teacherScopeUserId,
            },
          }
        : {}),
    },
    include: {
      group: { select: { name: true, color: true } },
      _count: { select: { attendances: { where: { status: 'PRESENT' } } } },
    },
    orderBy: { date: 'desc' },
    take: 30,
  })

  const sessions: HistorySession[] = rows.map((s) => ({
    id: s.id,
    date: s.date,
    group: s.group,
    _count: { attendance: s._count.attendances },
  }))

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">سجل الحضور</h1>
      <AttendanceHistory sessions={sessions} />
    </div>
  )
}
