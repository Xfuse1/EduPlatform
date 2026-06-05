import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { errorResponse, successResponse, validationError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { requireTenant } from '@/lib/tenant'
import { sendOtp } from '@/modules/auth/actions'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()

    // Throttle OTP sends per client IP to curb SMS-cost abuse and enumeration.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`otp-send:${ip}`, 10, 10 * 60 * 1000)
    if (!rl.allowed) {
      return errorResponse(
        'RATE_LIMITED',
        'محاولات كثيرة لإرسال رمز التحقق. يرجى المحاولة لاحقاً',
        429,
      )
    }

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
