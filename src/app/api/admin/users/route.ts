import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireSuperAdminApi, toAdminApiError } from "@/lib/platform-admin";
import { getPlatformUsers } from "@/modules/admin/queries";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdminApi(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const role = searchParams.get("role") ?? undefined;
    const tenantId = searchParams.get("tenantId") ?? undefined;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const result = await getPlatformUsers({
      search,
      role,
      tenantId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return successResponse(result);
  } catch (error) {
    const parsed = toAdminApiError(error);
    return errorResponse(parsed.code, parsed.message, parsed.status);
  }
}

