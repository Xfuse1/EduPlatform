import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
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

  const teacherScopeUserId = getTeacherScopeUserId(tenant, user)

  const [profile, groups] = await Promise.all([
    getStudentProfile(tenant.id, studentId, teacherScopeUserId ?? undefined),
    getGroups(tenant.id, teacherScopeUserId ?? undefined),
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
