import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import {
  applySessionCookie,
  UnauthorizedError,
} from '@/lib/auth'
import { errorResponse, successResponse, validationError } from '@/lib/api-response'
import { applyTenantContextCookie } from '@/lib/tenant-context'
import { requireTenant } from '@/lib/tenant'
import { verifyOtp } from '@/modules/auth/actions'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const payload = await request.json()
    const result = await verifyOtp(tenant.id, payload)
    const response = successResponse({
      user: result.user,
      redirectTo: result.redirectTo,
    })

    applySessionCookie(response, result.session)
    applyTenantContextCookie(response, tenant.slug, result.session.expiresAt)

    return response
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.flatten().fieldErrors)
    }

    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'OTP_VERIFY_FAILED',
      error instanceof Error ? error.message : 'تعذر التحقق من الرمز',
      400,
    )
  }
}
