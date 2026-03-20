import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import {
  applySessionCookie,
  UnauthorizedError,
} from '@/lib/auth'
import { errorResponse, successResponse, validationError } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'
import { verifyOtp } from '@/modules/auth/actions'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant(request)
    const payload = await request.json()
    const result = await verifyOtp(tenant.id, payload)
    const response = successResponse({
      user: result.user,
      redirectTo: result.redirectTo,
    })

    applySessionCookie(response, result.session)

    return response
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.flatten().fieldErrors)
    }

    if (error instanceof TenantNotFoundError) {
      return errorResponse('TENANT_NOT_FOUND', error.message, 404)
    }

    if (error instanceof InactiveTenantError) {
      return errorResponse('TENANT_INACTIVE', error.message, 403)
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
