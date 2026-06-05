'use server';

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { parseTenantSettingsFormData } from "@/modules/settings/validations";

type SettingsPayload = {
  name: string;
  themeColor?: string;
  phone?: string;
  region?: string;
  bio?: string;
  subjects?: string[];
  logoUrl?: string;
};

type UpdateTenantSettingsResult = {
  success: boolean;
  message?: string;
};

export async function updateTenantSettings(data: SettingsPayload): Promise<UpdateTenantSettingsResult> {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.tenantId !== tenant.id) {
    return {
      success: false,
      message: "ليس لديك صلاحية",
    };
  }

  requireRole(user.role, ["CENTER_ADMIN", "ADMIN", "MANAGER", "TEACHER"]);

  const normalizedSubjects = Array.from(new Set((data.subjects ?? []).map((subject) => subject.trim()).filter(Boolean)));

  // Partial update: a key is only written when it is explicitly present in the
  // payload. Passing `undefined` means "leave unchanged" (so callers that do not
  // edit phone never erase it); an empty/whitespace string means "clear" → null.
  const toNullableUpdate = (value: string | undefined) =>
    value === undefined ? undefined : value.trim() ? value.trim() : null;

  try {
    await db.tenant.update({
      where: {
        id: tenant.id,
      },
      data: {
        name: data.name,
        ...(data.themeColor ? { themeColor: data.themeColor } : {}),
        ...("phone" in data ? { phone: toNullableUpdate(data.phone) } : {}),
        ...("region" in data ? { region: toNullableUpdate(data.region) } : {}),
        ...("bio" in data ? { bio: toNullableUpdate(data.bio) } : {}),
        ...("logoUrl" in data ? { logoUrl: toNullableUpdate(data.logoUrl) } : {}),
        subjects: normalizedSubjects,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/teacher/settings");
    revalidatePath("/center/settings");

    return { success: true };
  } catch (error) {
    console.error("DB updateTenantSettings failed:", error);

    return {
      success: false,
      message: "حدث خطأ، حاول مرة أخرى",
    };
  }
}

export async function updateTenant(input: FormData | Record<string, unknown>) {
  const parsed = parseTenantSettingsFormData(input);

  // Note: phone is intentionally omitted — this form does not edit the tenant
  // phone, so it must be left unchanged (not erased).
  return updateTenantSettings({
    name: parsed.name,
    region: parsed.region,
    bio: parsed.bio,
    logoUrl: parsed.logoUrl,
    subjects: parsed.subjects,
  });
}
