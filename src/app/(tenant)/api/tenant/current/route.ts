import type { NextRequest } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const [tenant, user] = await Promise.all([
      requireTenant(request),
      getCurrentUser(request),
    ])

    return successResponse({
      tenant,
      user,
    })
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return errorResponse('TENANT_NOT_FOUND', error.message, 404)
    }

    if (error instanceof InactiveTenantError) {
      return errorResponse('TENANT_INACTIVE', error.message, 403)
    }

    return errorResponse(
      'TENANT_CURRENT_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب بيانات المؤسسة',
      400,
    )
  }
}
