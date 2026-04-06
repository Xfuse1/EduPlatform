import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { errorResponse, successResponse, validationError } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { registerStudent } from '@/modules/public-pages/actions'

export async function POST(request: NextRequest) {
  try {
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
