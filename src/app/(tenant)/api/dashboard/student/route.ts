import type { NextRequest } from 'next/server'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const [tenant, user] = await Promise.all([
      requireTenant(),
      requireAuth(request),
    ])

    if (user.role !== 'STUDENT') {
      return forbidden()
    }

    return successResponse({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      user,
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'STUDENT_DASHBOARD_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب لوحة الطالب',
      400,
    )
  }
}
