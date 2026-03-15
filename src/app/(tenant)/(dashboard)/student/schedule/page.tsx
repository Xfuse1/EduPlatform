import { notFound } from 'next/navigation'

import EmptyState from '@/components/shared/EmptyState'
import { requireAuth } from '@/lib/auth'

export default async function StudentSchedulePage() {
  const user = await requireAuth()

  if (user.role !== 'STUDENT') {
    notFound()
  }

  return (
    <EmptyState
      title="جدول الطالب قيد الاستكمال"
      message="تم تجهيز المسار وتأمينه، وسيظهر جدول الطالب الفعلي بعد اكتمال وحدة الطالب في الخطة التالية."
    />
  )
}
