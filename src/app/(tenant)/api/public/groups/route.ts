import type { NextRequest } from 'next/server'

import { errorResponse, successResponse } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'
import { getPublicGroups } from '@/modules/public-pages/queries'

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant(request)
    const groups = await getPublicGroups(tenant.id)

    return successResponse(groups, { total: groups.length, page: 1 })
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return errorResponse('TENANT_NOT_FOUND', error.message, 404)
    }

    if (error instanceof InactiveTenantError) {
      return errorResponse('TENANT_INACTIVE', error.message, 403)
    }

    return errorResponse(
      'PUBLIC_GROUPS_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب المجموعات المتاحة',
      400,
    )
  }
}
