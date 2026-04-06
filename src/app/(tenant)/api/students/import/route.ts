import type { NextRequest } from 'next/server'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { bulkImport } from '@/modules/students/actions'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth(request)

    if (user.role !== 'TEACHER' && user.role !== 'ASSISTANT') {
      return forbidden()
    }

    const payload = (await request.json()) as {
      records?: Record<string, unknown>[]
    }

    const result = await bulkImport(tenant.id, payload.records ?? [])
    return successResponse(result)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'STUDENTS_IMPORT_FAILED',
      error instanceof Error ? error.message : 'تعذر استيراد الطلاب',
      400,
    )
  }
}
