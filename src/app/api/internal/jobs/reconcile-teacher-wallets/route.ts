import { NextRequest } from 'next/server'

import { env } from '@/config/env'
import { errorResponse, successResponse } from '@/lib/api-response'
import { reconcileTeacherWalletsFromPaidPayments } from '@/modules/payments/providers/transfer'

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('x-internal-jobs-secret')
  return !!env.INTERNAL_JOBS_SECRET && token === env.INTERNAL_JOBS_SECRET
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return errorResponse('UNAUTHORIZED', 'Invalid jobs secret', 401)
  }

  const body = await req.json().catch(() => ({}))
  const tenantId = typeof body.tenantId === 'string' && body.tenantId.length > 0 ? body.tenantId : undefined
  const limit = typeof body.limit === 'number' ? body.limit : 100

  const result = await reconcileTeacherWalletsFromPaidPayments({ tenantId, limit })
  return successResponse(result)
}
