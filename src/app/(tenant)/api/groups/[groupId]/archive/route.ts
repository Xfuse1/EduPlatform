import type { NextRequest } from 'next/server'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { requireTenant } from '@/lib/tenant'
import { archiveGroup } from '@/modules/groups/actions'

type RouteProps = {
  params: Promise<{
    groupId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    const [{ groupId }, , user] = await Promise.all([
      params,
      requireTenant(),
      requireAuth(request),
    ])

    if (!checkRole(user.role, STAFF_ROLES)) {
      return forbidden()
    }

    const group = await archiveGroup(groupId)
    return successResponse(group)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse('GROUP_ARCHIVE_FAILED', 'تعذر أرشفة المجموعة', 400)
  }
}
