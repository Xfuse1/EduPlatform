"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireSuperAdminPage } from "@/lib/platform-admin";
import { upsertSubscriptionPlanConfig } from "@/modules/payments/providers/plan-config";

export async function setTenantStatusAction(formData: FormData) {
  await requireSuperAdminPage();

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const isActiveRaw = String(formData.get("isActive") ?? "").trim().toLowerCase();

  if (!tenantId || (isActiveRaw !== "true" && isActiveRaw !== "false")) {
    throw new Error("بيانات التحديث غير صالحة");
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: { isActive: isActiveRaw === "true" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/tenants");
}

export async function updatePlanConfigAction(formData: FormData) {
  await requireSuperAdminPage();

  const plan = String(formData.get("plan") ?? "").trim() as "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  const name = String(formData.get("name") ?? "").trim();
  const monthlyPrice = Number(formData.get("monthlyPrice") ?? 0);
  const yearlyPrice = Number(formData.get("yearlyPrice") ?? 0);
  const studentsLimit = Number(formData.get("studentsLimit") ?? 0);
  const groupsLimit = Number(formData.get("groupsLimit") ?? 0);
  const sessionsLimit = Number(formData.get("sessionsLimit") ?? 0);
  const storageLimit = Number(formData.get("storageLimit") ?? 0);
  const isActive = formData.getAll("isActive").includes("true");

  if (!["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(plan)) {
    throw new Error("الخطة غير صالحة");
  }

  if (!name) {
    throw new Error("اسم الباقة مطلوب");
  }

  if ([monthlyPrice, yearlyPrice, studentsLimit, groupsLimit, sessionsLimit, storageLimit].some((n) => !Number.isFinite(n) || n < 0)) {
    throw new Error("قيم الباقة غير صالحة");
  }

  await upsertSubscriptionPlanConfig({
    plan,
    name,
    monthlyPrice,
    yearlyPrice,
    studentsLimit,
    groupsLimit,
    sessionsLimit,
    storageLimit,
    isActive,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/plans");
  revalidatePath("/payments/subscription");
}
