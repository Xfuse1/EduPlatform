import type { NextRequest } from 'next/server'

import { errorResponse, successResponse } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { getPublicGroups } from '@/modules/public-pages/queries'

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const groups = await getPublicGroups(tenant.id)

    return successResponse(groups, { total: groups.length, page: 1 })
  } catch (error) {
    return errorResponse(
      'PUBLIC_GROUPS_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب المجموعات المتاحة',
      400,
    )
  }
}
