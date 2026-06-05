import { NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { checkRole, STAFF_ROLES } from '@/lib/permissions'
import { requireTenant } from '@/lib/tenant'
import { getTeacherTransfers } from '@/modules/payments/queries'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth(req)

    if (!checkRole(user.role, STAFF_ROLES)) {
      return forbidden()
    }

    const { searchParams } = new URL(req.url)
    const parsedLimit = Number(searchParams.get('limit') ?? '50')
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1), 100)

    const transfers = await getTeacherTransfers(tenant.id, limit)
    return successResponse(transfers)
  } catch (error) {
    return errorResponse('FETCH_TRANSFERS_FAILED', error instanceof Error ? error.message : 'Failed to fetch transfers', 400)
  }
}
