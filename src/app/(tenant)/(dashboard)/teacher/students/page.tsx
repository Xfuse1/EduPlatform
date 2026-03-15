import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import StudentList from '@/modules/students/components/StudentList'
import { getStudents } from '@/modules/students/queries'
import { getGroups } from '@/modules/groups/queries'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function TeacherStudentsPage() {
  const [tenant, user] = await Promise.all([requireTenant(), requireAuth()])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const [students, groups] = await Promise.all([
    getStudents(tenant.id),
    getGroups(tenant.id),
  ])

  return <StudentList students={students} groups={groups} />
}
