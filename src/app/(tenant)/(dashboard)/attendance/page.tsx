import { Calendar } from 'lucide-react'
import { generateTodaySessions } from '@/modules/attendance/actions'
import { getTodaySessions } from '@/modules/attendance/queries'
import { requireTenant } from '@/lib/tenant'
import { SessionCard } from '@/modules/attendance/components/SessionCard'
import EmptyState from '@/components/shared/EmptyState'

// ── B-02: Attendance Index Page ──────────────────────────────────────────────

export default async function AttendancePage() {
  // ⚠️ أولاً ولّد الحصص (mutation) ثم اقرأها (query)
  await generateTodaySessions()
  const tenant = await requireTenant()
  const sessions = await getTodaySessions(tenant.id)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">حصص اليوم</h1>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title="لا توجد حصص اليوم"
          message="لم يتم جدولة أي حصص اليوم 📅"
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
