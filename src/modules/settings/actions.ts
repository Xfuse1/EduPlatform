'use server';

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
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
  const normalizedSubjects = Array.from(new Set((data.subjects ?? []).map((subject) => subject.trim()).filter(Boolean)));

  try {
    await db.tenant.update({
      where: {
        id: tenant.id,
      },
      data: {
        name: data.name,
        ...(data.themeColor ? { themeColor: data.themeColor } : {}),
        phone: data.phone?.trim() ? data.phone.trim() : null,
        region: data.region?.trim() ? data.region.trim() : null,
        bio: data.bio?.trim() ? data.bio.trim() : null,
        logoUrl: data.logoUrl?.trim() ? data.logoUrl.trim() : null,
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

  return updateTenantSettings({
    name: parsed.name,
    phone: undefined,
    region: parsed.region,
    bio: parsed.bio,
    logoUrl: parsed.logoUrl,
    subjects: parsed.subjects,
  });
}
