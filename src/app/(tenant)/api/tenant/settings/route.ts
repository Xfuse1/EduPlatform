import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { requireAuth, UnauthorizedError } from '@/lib/auth'
import { errorResponse, forbidden, successResponse, validationError } from '@/lib/api-response'
import { requireTenant } from '@/lib/tenant'
import { updateTenant } from '@/modules/settings/actions'
import { getTenantSettings } from '@/modules/settings/queries'

async function requestToFormData(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  if (
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
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

    if (user.role !== 'TEACHER') {
      return forbidden()
    }

    const settings = await getTenantSettings(tenant.id)
    return successResponse(settings)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'TENANT_SETTINGS_FAILED',
      error instanceof Error ? error.message : 'تعذر جلب الإعدادات',
      400,
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await requestToFormData(request)
    const tenant = await updateTenant(formData)
    return successResponse(tenant)
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.flatten().fieldErrors)
    }

    if (error instanceof UnauthorizedError) {
      return errorResponse('UNAUTHORIZED', error.message, 401)
    }

    return errorResponse(
      'TENANT_SETTINGS_UPDATE_FAILED',
      error instanceof Error ? error.message : 'تعذر حفظ الإعدادات',
      400,
    )
  }
}
