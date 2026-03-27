import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

export default async function ParentChildPage() {
  const user = await requireAuth()

  if (user.role !== 'PARENT') {
    notFound()
  }

  return (
    <EmptyState
      title="ملف الابن قيد الاستكمال"
      message="سيظهر هذا الملف بعد اكتمال وحدة ولي الأمر وربط الأبناء بالحساب."
    />
  )
}
