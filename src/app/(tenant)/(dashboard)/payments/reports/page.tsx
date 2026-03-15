import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function PaymentReportsPage() {
  const user = await requireAuth()

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  return (
    <EmptyState
      title="تقارير المصاريف قيد الاستكمال"
      message="سيتم عرض التقارير المالية الكاملة هنا بعد اكتمال موديول المصاريف."
    />
  )
}
