import type { NextRequest } from 'next/server'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, notFound, successResponse } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
import { getGroupById } from '@/modules/groups/queries'

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
    const group = await getGroupById(tenant.id, groupId, teacherScopeUserId ?? undefined)

    if (!group) {
      return notFound('المجموعة غير موجودة')
    }

    return successResponse(group)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'GROUP_FETCH_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب المجموعة',
      400,
    )
  }
}
