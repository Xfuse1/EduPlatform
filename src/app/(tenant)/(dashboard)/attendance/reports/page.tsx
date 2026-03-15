import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function AttendanceReportsPage() {
  const user = await requireAuth()

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  return (
    <EmptyState
      title="تقارير الحضور قيد الاستكمال"
      message="سيتم توصيل تقارير الحضور بهذه الصفحة بعد اكتمال الوحدة المالكة للحضور."
    />
  )
}
