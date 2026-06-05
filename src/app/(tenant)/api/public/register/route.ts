import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { errorResponse, successResponse, validationError } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { requireTenant } from '@/lib/tenant'
import { registerStudent } from '@/modules/public-pages/actions'

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'

    const rl = rateLimit(`public-register:${ip}`, 5, 10 * 60 * 1000)

    if (!rl.allowed) {
      return errorResponse(
        'RATE_LIMITED',
        'عدد محاولات التسجيل كبير، حاول لاحقًا',
        429,
      )
    }

    await requireTenant()
    const payload = (await request.json()) as Record<string, unknown>
    const formData = new FormData()

    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && value !== undefined) {
        formData.set(key, String(value))
      }
    }

    const result = await registerStudent(formData)

    return successResponse(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.flatten().fieldErrors)
    }

    return errorResponse(
      'PUBLIC_REGISTER_FAILED',
      error instanceof Error ? error.message : 'تعذر تسجيل الطالب الآن',
      400,
    )
  }
}
