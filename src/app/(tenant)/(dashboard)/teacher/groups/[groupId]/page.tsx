import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import GroupDetails from '@/modules/groups/components/GroupDetails'
import { getGroupById } from '@/modules/groups/queries'
import { getStudents } from '@/modules/students/queries'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

type GroupDetailsPageProps = {
  params: Promise<{
    groupId: string
  }>
}

export default async function GroupDetailsPage({
  params,
}: GroupDetailsPageProps) {
  const [{ groupId }, tenant, user] = await Promise.all([
    params,
    requireTenant(),
    requireAuth(),
  ])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const [group, availableStudents] = await Promise.all([
    getGroupById(tenant.id, groupId),
    getStudents(tenant.id),
  ])

  if (!group) {
    notFound()
  }

  return <GroupDetails group={group} availableStudents={availableStudents} />
}
