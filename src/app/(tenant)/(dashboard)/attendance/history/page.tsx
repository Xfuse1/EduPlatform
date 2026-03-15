import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function AttendanceHistoryPage() {
  const user = await requireAuth()

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  return (
    <EmptyState
      title="سجل الحضور قيد الاستكمال"
      message="الشاشة التفصيلية لسجل الحضور ستُربط عند اكتمال وحدة الحضور."
    />
  )
}
