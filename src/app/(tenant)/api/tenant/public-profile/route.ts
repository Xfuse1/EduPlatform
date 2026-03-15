import type { NextRequest } from 'next/server'

import { errorResponse, successResponse } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'
import { getPublicGroups, getPublicTenantProfile } from '@/modules/public-pages/queries'

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant(request)
    const [profile, groups] = await Promise.all([
      getPublicTenantProfile(tenant.id),
      getPublicGroups(tenant.id),
    ])

    return successResponse({
      tenant: profile,
      groups,
    })
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return errorResponse('TENANT_NOT_FOUND', error.message, 404)
    }

    if (error instanceof InactiveTenantError) {
      return errorResponse('TENANT_INACTIVE', error.message, 403)
    }

    return errorResponse(
      'TENANT_PUBLIC_PROFILE_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب الملف العام للمؤسسة',
      400,
    )
  }
}
