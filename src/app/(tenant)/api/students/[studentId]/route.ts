import type { NextRequest } from 'next/server'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, notFound, successResponse } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'
import { getStudentById } from '@/modules/students/queries'

type RouteProps = {
  params: Promise<{
    studentId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const [{ studentId }, tenant, user] = await Promise.all([
      params,
      requireTenant(request),
      requireAuth(request),
    ])

    if (user.role !== 'TEACHER' && user.role !== 'ASSISTANT') {
      return forbidden()
    }

    const student = await getStudentById(tenant.id, studentId)

    if (!student) {
      return notFound('الطالب غير موجود')
    }

    return successResponse(student)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    if (error instanceof TenantNotFoundError) {
      return errorResponse('TENANT_NOT_FOUND', error.message, 404)
    }

    if (error instanceof InactiveTenantError) {
      return errorResponse('TENANT_INACTIVE', error.message, 403)
    }

    return errorResponse(
      'STUDENT_FETCH_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب الطالب',
      400,
    )
  }
}
