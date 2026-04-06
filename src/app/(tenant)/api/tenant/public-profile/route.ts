import type { NextRequest } from 'next/server'

import { errorResponse, successResponse } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { getPublicGroups, getPublicTenantProfile } from '@/modules/public-pages/queries'

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const [profile, groups] = await Promise.all([
      getPublicTenantProfile(tenant.id),
      getPublicGroups(tenant.id),
    ])

    return successResponse({
      tenant: profile,
      groups,
    })
  } catch (error) {
    return errorResponse(
      'TENANT_PUBLIC_PROFILE_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب الملف العام للمؤسسة',
      400,
    )
  }
}
