import { NextRequest } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { getTeacherTransfers } from '@/modules/payments/queries'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant()
    await requireAuth(req)

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') ?? '50')

    const transfers = await getTeacherTransfers(tenant.id, Number.isFinite(limit) ? limit : 50)
    return successResponse(transfers)
  } catch (error) {
    return errorResponse('FETCH_TRANSFERS_FAILED', error instanceof Error ? error.message : 'Failed to fetch transfers', 400)
  }
}

