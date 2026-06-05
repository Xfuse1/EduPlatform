import { redirect } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getOverdueStudents } from '@/modules/payments/queries'
import { OverdueList } from '@/modules/payments/components/OverdueList'

// ── B-04: Overdue Payments Page ──────────────────────────────────────────────

export default async function OverduePage() {
  const tenant = await requireTenant()
  const user = await requireAuth()
  // Staff-only page: send students/parents back to their own dashboard.
  if (!checkRole(user.role, STAFF_ROLES)) {
    redirect(user.role === 'PARENT' ? '/parent' : '/student')
  }
  const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
  const overduePayments = await getOverdueStudents(tenant.id, teacherScopeUserId ?? undefined)

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">المتأخرون في السداد</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {overduePayments.length > 0
            ? `${overduePayments.length} طالب لديهم مدفوعات متأخرة`
            : 'لا يوجد متأخرون 🎉'}
        </p>
      </div>

      <OverdueList payments={overduePayments} />
    </div>
  )
}
