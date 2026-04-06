import type { NextRequest } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const [tenant, user] = await Promise.all([
      requireTenant(),
      getCurrentUser(request),
    ])

    return successResponse({
      tenant,
      user,
    })
  } catch (error) {
    return errorResponse(
      'TENANT_CURRENT_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب بيانات المؤسسة',
      400,
    )
  }
}
