import type { NextRequest } from 'next/server'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { requireTenant } from '@/lib/tenant'
import { getWeeklySchedule } from '@/modules/schedule/queries'

export async function GET(request: NextRequest) {
  try {
    const [tenant, user] = await Promise.all([
      requireTenant(),
      requireAuth(request),
    ])

    if (!checkRole(user.role, STAFF_ROLES)) {
      return forbidden()
    }

    const schedule = await getWeeklySchedule(tenant.id)
    return successResponse(schedule)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'SCHEDULE_FETCH_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب الجدول الأسبوعي',
      400,
    )
  }
}
