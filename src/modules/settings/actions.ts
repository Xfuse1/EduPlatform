'use server';

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

const settingsSchema = z.object({
  name: z.string().trim().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "لون غير صحيح").default("#1A5276"),
  phone: z.union([z.string().trim().regex(/^01[0-9]{9}$/, "رقم الهاتف غير صحيح"), z.literal("")]).optional(),
  region: z.string().trim().optional(),
  bio: z.string().trim().max(300, "النبذة يجب ألا تتجاوز 300 حرف").optional(),
  subjects: z.array(z.string().trim().min(1)).optional(),
});

type SettingsPayload = {
  name: string;
  themeColor: string;
  phone?: string;
  region?: string;
  bio?: string;
  subjects?: string[];
};

type UpdateTenantSettingsResult = {
  success: boolean;
  message?: string;
};

export async function updateTenantSettings(data: SettingsPayload): Promise<UpdateTenantSettingsResult> {
  const tenant = await requireTenant();
  const parsed = settingsSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "تعذر حفظ الإعدادات",
    };
  }

  const normalizedSubjects = Array.from(
    new Set(
      (parsed.data.subjects ?? [])
        .map((subject) => subject.trim())
        .filter(Boolean),
    ),
  );

  try {
    await db.tenant.update({
      where: {
        id: tenant.id,
      },
      data: {
        name: parsed.data.name,
        themeColor: parsed.data.themeColor,
        phone: parsed.data.phone?.trim() ? parsed.data.phone.trim() : null,
        region: parsed.data.region?.trim() ? parsed.data.region.trim() : null,
        bio: parsed.data.bio?.trim() ? parsed.data.bio.trim() : null,
        subjects: normalizedSubjects,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/teacher/settings");

    return { success: true };
  } catch (error) {
    console.error("DB updateTenantSettings failed:", error);

    return {
      success: false,
      message: "حدث خطأ، حاول مرة أخرى",
    };
  }
}
