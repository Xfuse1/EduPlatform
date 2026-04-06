import type { NextRequest } from 'next/server';

import { successResponse, unauthorized } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { requireTenant } from '@/lib/tenant';
import { getDashboardRouteForRole } from '@/modules/auth/queries';

export async function GET(_request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    return successResponse({
      user,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      redirectTo: getDashboardRouteForRole(user.role),
    });
  } catch {
    return unauthorized();
  }
}
