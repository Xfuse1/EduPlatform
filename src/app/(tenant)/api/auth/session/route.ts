import type { NextRequest } from 'next/server'

import { getCurrentSession, getCurrentUser } from '@/lib/auth'
import { successResponse, unauthorized } from '@/lib/api-response'
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from '@/lib/tenant'
import { getDashboardRouteForRole } from '@/modules/auth/queries'

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant(request)
    const [session, user] = await Promise.all([
      getCurrentSession(request),
      getCurrentUser(request),
    ])

    if (!session || !user) {
      return unauthorized()
    }

    return successResponse({
      session,
      user,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      redirectTo: getDashboardRouteForRole(user.role),
    })
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return unauthorized()
    }

    if (error instanceof InactiveTenantError) {
      return unauthorized()
    }

    return unauthorized()
  }
}
