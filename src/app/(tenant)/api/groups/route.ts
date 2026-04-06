import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse, validationError } from '@/lib/api-response'
import { getTeacherScopeUserId } from '@/lib/teacher-access'
import { requireTenant } from '@/lib/tenant'
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
    const tenant = await requireTenant()
    const user = await requireAuth(request)

    if (user.role !== 'TEACHER' && user.role !== 'ASSISTANT') {
      return forbidden()
    }

    const teacherScopeUserId = getTeacherScopeUserId(tenant, user)
    const groups = await getGroups(tenant.id, teacherScopeUserId ?? undefined)

    return successResponse(groups, { total: groups.length, page: 1 })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'GROUPS_FETCH_FAILED',
      error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø¬Ù„Ø¨ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª',
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

    return errorResponse(
      'GROUP_CREATE_FAILED',
      error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©',
      400,
    )
  }
}

