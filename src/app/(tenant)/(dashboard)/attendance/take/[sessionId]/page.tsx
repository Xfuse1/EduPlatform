import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getSessionAttendance } from '@/modules/attendance/queries'
import { AttendanceSheet } from '@/modules/attendance/components/AttendanceSheet'

// ── B-02: Take Attendance Page ───────────────────────────────────────────────

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function TakeAttendancePage({ params }: Props) {
  const { sessionId } = await params
  const tenant = await requireTenant()
  const user = await requireAuth()
  const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
  const data = await getSessionAttendance(tenant.id, sessionId, teacherScopeUserId ?? undefined)

  if (!data) notFound()

  const unpaidCount = data.students.filter(
    (s: any) => s.paymentStatus !== 'PAID',
  ).length

  return (
    <div className="pb-24">
      {/* تنبيه الطلاب غير المدفعين */}
      {unpaidCount > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3 text-sm text-yellow-800 text-center dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
          ⚠️ {unpaidCount} {unpaidCount === 1 ? 'طالب لم يدفع' : 'طلاب لم يدفعوا'} هذا الشهر
        </div>
      )}

      <div className="p-4">
        <h1 className="text-xl font-bold mb-1 text-start">
          {data.session.group.name}
        </h1>
        <p className="text-sm text-muted-foreground mb-4 text-start">
          {data.session.group.timeStart} — {data.session.group.timeEnd}
        </p>

        <AttendanceSheet
          sessionId={sessionId}
          students={data.students}
        />
      </div>
    </div>
  )
}
