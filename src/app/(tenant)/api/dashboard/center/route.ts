import type { NextRequest } from "next/server";

import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { errorResponse, forbidden, successResponse } from "@/lib/api-response";
import {
  InactiveTenantError,
  TenantNotFoundError,
  requireTenant,
} from "@/lib/tenant";
import { getCenterDashboardData } from "@/modules/dashboard/queries";

export async function GET(request: NextRequest) {
  try {
    const [tenant, user] = await Promise.all([
      requireTenant(request),
      requireAuth(request),
    ]);

    if (user.role !== "CENTER_ADMIN") {
      return forbidden();
    }

    const data = await getCenterDashboardData(tenant.id);

    return successResponse({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      data,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse("UNAUTHORIZED", error.message, 401);
    }

    if (error instanceof TenantNotFoundError) {
      return errorResponse("TENANT_NOT_FOUND", error.message, 404);
    }

    if (error instanceof InactiveTenantError) {
      return errorResponse("TENANT_INACTIVE", error.message, 403);
    }

    return errorResponse(
      "CENTER_DASHBOARD_FAILED",
      error instanceof Error ? error.message : "Failed to load center dashboard",
      400,
    );
  }
}