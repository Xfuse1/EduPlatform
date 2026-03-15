import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import { getGroups } from '@/modules/groups/queries'
import StudentProfile from '@/modules/students/components/StudentProfile'
import { getStudentProfile } from '@/modules/students/queries'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

type StudentProfilePageProps = {
  params: Promise<{
    studentId: string
  }>
}

export default async function StudentProfilePage({
  params,
}: StudentProfilePageProps) {
  const [{ studentId }, tenant, user] = await Promise.all([
    params,
    requireTenant(),
    requireAuth(),
  ])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const [profile, groups] = await Promise.all([
    getStudentProfile(tenant.id, studentId),
    getGroups(tenant.id),
  ])

  if (!profile) {
    notFound()
  }

  return (
    <StudentProfile
      studentId={studentId}
      profile={profile}
      availableGroups={groups}
    />
  )
}
