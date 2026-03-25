import { NextRequest, NextResponse } from "next/server";

import { getTenantBySlug } from "@/lib/tenant";
import { getOpenGroups, getTeacherPublicProfile } from "@/modules/public-pages/queries";

export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase();

  if (!tenantSlug) {
    return NextResponse.json(
      {
        error: {
          code: "TENANT_SLUG_REQUIRED",
          message: "tenant slug is required",
        },
      },
      { status: 400 },
    );
  }

  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant || !tenant.isActive) {
    return NextResponse.json(
      {
        error: {
          code: "TENANT_NOT_FOUND",
          message: "tenant not found",
        },
      },
      { status: 404 },
    );
  }

  if (tenant.accountType === "PARENT") {
    return NextResponse.json({
      tenant,
      teacher: null,
      groups: [],
    });
  }

  const [teacher, groups] = await Promise.all([getTeacherPublicProfile(tenant.id), getOpenGroups(tenant.id)]);

  if (!teacher) {
    return NextResponse.json(
      {
        error: {
          code: "TEACHER_PROFILE_NOT_FOUND",
          message: "teacher profile not found",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    tenant,
    teacher,
    groups,
  });
}
