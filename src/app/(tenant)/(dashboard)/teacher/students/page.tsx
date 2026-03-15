import { PaymentStatus } from '@prisma/client'
import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import StudentList from '@/modules/students/components/StudentList'
import { getStudents } from '@/modules/students/queries'
import { getGroups } from '@/modules/groups/queries'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])
const PAYMENT_STATUS_VALUES = new Set<PaymentStatus>([
  PaymentStatus.PAID,
  PaymentStatus.PARTIAL,
  PaymentStatus.PENDING,
  PaymentStatus.OVERDUE,
])

type TeacherStudentsPageProps = {
  searchParams: Promise<{
    search?: string | string[]
    groupId?: string | string[]
    paymentStatus?: string | string[]
  }>
}

function getSingleSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

export default async function TeacherStudentsPage({
  searchParams,
}: TeacherStudentsPageProps) {
  const [tenant, user, resolvedSearchParams] = await Promise.all([
    requireTenant(),
    requireAuth(),
    searchParams,
  ])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const search = getSingleSearchParam(resolvedSearchParams.search)?.trim() ?? ''
  const groupId = getSingleSearchParam(resolvedSearchParams.groupId)?.trim() ?? ''
  const rawPaymentStatus =
    getSingleSearchParam(resolvedSearchParams.paymentStatus)?.trim() ?? ''
  const paymentStatus = PAYMENT_STATUS_VALUES.has(rawPaymentStatus as PaymentStatus)
    ? (rawPaymentStatus as PaymentStatus)
    : undefined

  const [students, groups] = await Promise.all([
    getStudents(tenant.id, {
      search: search || undefined,
      groupId: groupId || undefined,
      paymentStatus,
    }),
    getGroups(tenant.id),
  ])

  return (
    <StudentList
      key={`${search}|${groupId}|${paymentStatus ?? ''}`}
      students={students}
      groups={groups}
      initialFilters={{
        search,
        groupId,
        paymentStatus: paymentStatus ?? '',
      }}
    />
  )
}
