import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { errorResponse, successResponse, validationError } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'
import { registerStudent } from '@/modules/public-pages/actions'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant(request)
    const payload = await request.json()
    const result = await registerStudent(tenant.id, payload)

    return successResponse({
      studentId: result.student.id,
      enrollmentStatus: result.enrollment.status,
    })
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

    return errorResponse(
      'PUBLIC_REGISTER_FAILED',
      error instanceof Error ? error.message : 'تعذر تسجيل الطالب الآن',
      400,
    )
  }
}
