import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function TakeAttendancePage() {
  const user = await requireAuth()

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  return (
    <EmptyState
      title="أخذ الحضور قيد الاستكمال"
      message="واجهة تسجيل الحضور المباشر ستظهر هنا مع اكتمال موديول الحضور."
    />
  )
}
