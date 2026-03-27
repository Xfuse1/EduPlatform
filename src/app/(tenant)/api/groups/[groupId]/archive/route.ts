import type { NextRequest } from 'next/server'

import { UnauthorizedError } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
} from '@/lib/tenant'
import { archiveGroup } from '@/modules/groups/actions'

type RouteProps = {
  params: Promise<{
    groupId: string
  }>
}

export async function POST(_request: NextRequest, { params }: RouteProps) {
  try {
    const { groupId } = await params
    const group = await archiveGroup(groupId)
    return successResponse(group)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    if (error instanceof TenantNotFoundError) {
      return errorResponse('TENANT_NOT_FOUND', error.message, 404)
    }

    if (error instanceof InactiveTenantError) {
      return errorResponse('TENANT_INACTIVE', error.message, 403)
    }

    return errorResponse(
      'GROUP_ARCHIVE_FAILED',
      error instanceof Error ? error.message : 'تعذر أرشفة المجموعة',
      400,
    )
  }
}
