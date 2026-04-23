import type { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, successResponse, validationError } from "@/lib/api-response";
import { requireSuperAdminApi, toAdminApiError } from "@/lib/platform-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    await requireSuperAdminApi(request);

    const body = (await request.json().catch(() => null)) as { isActive?: unknown } | null;
    if (!body || typeof body.isActive !== "boolean") {
      return validationError({ isActive: ["isActive must be a boolean"] });
    }

    const { tenantId } = await params;
    const updated = await db.tenant.update({
      where: { id: tenantId },
      data: { isActive: body.isActive },
      select: {
        id: true,
        slug: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    const parsed = toAdminApiError(error);
    const status = parsed.code === "ADMIN_API_ERROR" ? 400 : parsed.status;
    return errorResponse(parsed.code, parsed.message, status);
  }
}

