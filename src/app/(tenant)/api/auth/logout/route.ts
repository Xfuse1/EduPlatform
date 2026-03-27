import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  clearSessionCookie,
  getSessionToken,
} from '@/lib/auth'
import { successResponse } from '@/lib/api-response'
import { clearTenantContextCookie } from '@/lib/tenant-context'
import { logout } from '@/modules/auth/actions'

async function buildLogoutResponse(request: NextRequest, redirectToLogin: boolean) {
  const token = await getSessionToken(request)
  await logout(token)

  if (redirectToLogin) {
    const response = NextResponse.redirect(new URL('/', request.url))
    clearSessionCookie(response)
    clearTenantContextCookie(response)
    return response
  }

  const response = successResponse({ success: true })
  clearSessionCookie(response)
  clearTenantContextCookie(response)
  return response
}

export async function GET(request: NextRequest) {
  return buildLogoutResponse(request, true)
}

export async function POST(request: NextRequest) {
  return buildLogoutResponse(request, false)
}
