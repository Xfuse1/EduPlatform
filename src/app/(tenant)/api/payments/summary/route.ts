import { type NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { getRevenueSummary } from '@/modules/payments/queries'

export async function GET(_req: NextRequest) {
  try {
    const tenant = await requireTenant()
    await requireAuth()
    const summary = await getRevenueSummary(tenant.id)

    return successResponse(summary)
  } catch {
    return errorResponse('FETCH_FAILED', 'Failed to load revenue summary', 500)
  }
}

