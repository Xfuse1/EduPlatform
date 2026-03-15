import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function OverduePaymentsPage() {
  const user = await requireAuth()

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  return (
    <EmptyState
      title="المتأخرات قيد الاستكمال"
      message="ستظهر تقارير المتأخرات التفصيلية مع اكتمال موديول المصاريف."
    />
  )
}
