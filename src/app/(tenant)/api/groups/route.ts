import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse, validationError } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'
import { createGroup } from '@/modules/groups/actions'
import { getGroups } from '@/modules/groups/queries'

async function requestToFormData(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    return request.formData()
  }

  const payload = (await request.json()) as Record<string, unknown>
  const formData = new FormData()

  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        formData.append(key, String(entry))
      }
      continue
    }

    if (value !== undefined && value !== null) {
      formData.set(key, String(value))
    }
  }

  return formData
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant(request)
    const user = await requireAuth(request)

    if (user.role !== 'TEACHER' && user.role !== 'ASSISTANT') {
      return forbidden()
    }

    const groups = await getGroups(tenant.id)
    return successResponse(groups, { total: groups.length, page: 1 })
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
      'GROUPS_FETCH_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب المجموعات',
      400,
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await requestToFormData(request)
    const group = await createGroup(formData)

    return successResponse(group)
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
      'GROUP_CREATE_FAILED',
      error instanceof Error ? error.message : 'تعذر إنشاء المجموعة',
      400,
    )
  }
}
