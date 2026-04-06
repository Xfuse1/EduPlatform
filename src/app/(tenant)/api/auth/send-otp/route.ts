import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { errorResponse, successResponse, validationError } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { sendOtp } from '@/modules/auth/actions'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const payload = await request.json()
    const result = await sendOtp(tenant.id, payload)

    return successResponse(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.flatten().fieldErrors)
    }

    return errorResponse(
      'OTP_SEND_FAILED',
      error instanceof Error ? error.message : 'تعذر إرسال رمز التحقق',
      400,
    )
  }
}
