import type { NextRequest } from "next/server";

import { Prisma } from "@/generated/client";
import { db } from "@/lib/db";
import { errorResponse, notFound, successResponse, validationError } from "@/lib/api-response";
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("السنتر غير موجود");
    }

    const parsed = toAdminApiError(error);
    if (parsed.code === "ADMIN_API_ERROR") {
      console.error("PATCH /api/admin/tenants/[tenantId]/status failed:", error);
      return errorResponse(parsed.code, "حدث خطأ غير متوقع", 500);
    }
    return errorResponse(parsed.code, parsed.message, parsed.status);
  }
}

