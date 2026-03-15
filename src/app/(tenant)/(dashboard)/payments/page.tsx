import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function PaymentsPage() {
  const user = await requireAuth()

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  return (
    <EmptyState
      title="إدارة المصاريف قيد الاستكمال"
      message="الموديول المالِك للمصاريف سيُكمل الشاشات التفصيلية لاحقًا، وتم الإبقاء هنا على مسار صالح بدل placeholder خام."
    />
  )
}
