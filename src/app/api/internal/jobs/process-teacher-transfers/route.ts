import { timingSafeEqual } from 'crypto'

import { NextRequest } from 'next/server'

import { env } from '@/config/env'
import { errorResponse } from '@/lib/api-response'

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('x-internal-jobs-secret')
  return !!env.INTERNAL_JOBS_SECRET && !!token && safeEqual(token, env.INTERNAL_JOBS_SECRET)
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return errorResponse('UNAUTHORIZED', 'Invalid jobs secret', 401)
  }

  // Teacher disbursements are currently handled as manual wallet withdrawals;
  // there is no automated transfer integration yet. Report NOT_IMPLEMENTED so
  // monitoring does not treat this endpoint as healthy work.
  return errorResponse(
    'NOT_IMPLEMENTED',
    'Automated teacher transfers are not implemented (handled as manual withdrawals).',
    501,
  )
}
