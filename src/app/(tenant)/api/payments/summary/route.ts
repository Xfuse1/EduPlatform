import { type NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary } from '@/modules/payments/queries'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth(req)

    if (!checkRole(user.role, STAFF_ROLES)) {
      return forbidden()
    }

    const summary = await getRevenueSummary(tenant.id)

    return successResponse(summary)
  } catch {
    return errorResponse('FETCH_FAILED', 'Failed to load revenue summary', 500)
  }
}
