import type { NextRequest } from "next/server";

import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { errorResponse, forbidden, successResponse } from "@/lib/api-response";
import { requireTenant } from "@/lib/tenant";
import { getCenterDashboardData } from "@/modules/dashboard/queries";

export async function GET(request: NextRequest) {
  try {
    const [tenant, user] = await Promise.all([
      requireTenant(),
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

    return errorResponse(
      "CENTER_DASHBOARD_FAILED",
      error instanceof Error ? error.message : "Failed to load center dashboard",
      400,
    );
  }
}