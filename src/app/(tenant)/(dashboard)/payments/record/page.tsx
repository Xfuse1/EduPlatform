import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function RecordPaymentPage() {
  const user = await requireAuth()

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  return (
    <EmptyState
      title="تسجيل المصروفات قيد الاستكمال"
      message="واجهة تسجيل المدفوعات التفصيلية ستُستكمل مع موديول المصاريف."
    />
  )
}
