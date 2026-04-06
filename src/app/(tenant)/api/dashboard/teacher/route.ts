import type { NextRequest } from 'next/server'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getGroups } from '@/modules/groups/queries'
import { getStudents } from '@/modules/students/queries'

export async function GET(request: NextRequest) {
  try {
    const [tenant, user] = await Promise.all([
      requireTenant(),
      requireAuth(request),
    ])

    if (user.role !== 'TEACHER' && user.role !== 'ASSISTANT') {
      return forbidden()
    }

    const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
    const [groups, students] = await Promise.all([
      getGroups(tenant.id, teacherScopeUserId ?? undefined),
      getStudents(tenant.id, {}, teacherScopeUserId ?? undefined),
    ])

    return successResponse({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      summary: {
        groups: groups.length,
        students: students.length,
      },
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'TEACHER_DASHBOARD_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب لوحة المعلم',
      400,
    )
  }
}
