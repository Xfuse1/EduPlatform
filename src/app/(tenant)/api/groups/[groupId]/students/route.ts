import type { NextRequest } from 'next/server'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getGroupStudents } from '@/modules/groups/queries'

type RouteProps = {
  params: Promise<{
    groupId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const [{ groupId }, tenant, user] = await Promise.all([
      params,
      requireTenant(),
      requireAuth(request),
    ])

    if (user.role !== 'TEACHER' && user.role !== 'ASSISTANT') {
      return forbidden()
    }

    const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
    const students = await getGroupStudents(tenant.id, groupId, teacherScopeUserId ?? undefined)

    return successResponse(students, { total: students.length, page: 1 })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'GROUP_STUDENTS_FETCH_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب طلاب المجموعة',
      400,
    )
  }
}
