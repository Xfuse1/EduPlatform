import { NextRequest } from 'next/server'

import { env } from '@/config/env'
import { errorResponse, successResponse } from '@/lib/api-response'
import { processPendingTeacherTransfers } from '@/modules/payments/providers/transfer'

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('x-internal-jobs-secret')
  return !!env.INTERNAL_JOBS_SECRET && token === env.INTERNAL_JOBS_SECRET
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return errorResponse('UNAUTHORIZED', 'Invalid jobs secret', 401)
  }

  const body = await req.json().catch(() => ({}))
  const limit = typeof body.limit === 'number' ? body.limit : 20

  const result = await processPendingTeacherTransfers(limit)
  return successResponse(result)
}

