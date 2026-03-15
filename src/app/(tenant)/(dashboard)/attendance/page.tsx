import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function AttendancePage() {
  const user = await requireAuth()

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  return (
    <EmptyState
      title="الحضور اليدوي قيد الاستكمال"
      message="تم تأمين المسار الأساسي للحضور، لكن شاشة التنفيذ الكاملة ستظهر عند اكتمال وحدة الحضور المالكة للمنطق."
    />
  )
}
