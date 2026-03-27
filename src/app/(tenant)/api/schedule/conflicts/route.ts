import type { NextRequest } from 'next/server'
import { ZodError, z } from 'zod'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse, validationError } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'
import { checkConflicts } from '@/modules/schedule/queries'

const scheduleConflictSchema = z.object({
  days: z.array(z.string()).min(1),
  timeStart: z.string().min(1),
  timeEnd: z.string().min(1),
  room: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const [tenant, user, payload] = await Promise.all([
      requireTenant(request),
      requireAuth(request),
      request.json(),
    ])

    if (user.role !== 'TEACHER' && user.role !== 'ASSISTANT') {
      return forbidden()
    }

    const data = scheduleConflictSchema.parse(payload)
    const conflicts = await checkConflicts(
      tenant.id,
      data.days,
      data.timeStart,
      data.timeEnd,
      data.room,
    )

    return successResponse(conflicts, { total: conflicts.length, page: 1 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.flatten().fieldErrors)
    }

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
      'SCHEDULE_CONFLICTS_FAILED',
      error instanceof Error ? error.message : 'تعذر فحص التعارضات',
      400,
    )
  }
}
