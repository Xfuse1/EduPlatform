"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { logFinancialEvent } from "@/lib/financial-audit";
import { requireSuperAdminPage } from "@/lib/platform-admin";
import { upsertSubscriptionPlanConfig } from "@/modules/payments/providers/plan-config";
import { creditUserWallet, debitUserWallet, getOrCreateWallet } from "@/modules/wallet/provider";

const ADMIN_WITHDRAWAL_METHODS = ["CASH", "ELECTRONIC_WALLET", "INSTAPAY", "BANK_TRANSFER", "OTHER"] as const;

type AdminWithdrawalMethod = (typeof ADMIN_WITHDRAWAL_METHODS)[number];

function parseAdminWithdrawalMethod(value: FormDataEntryValue | null): AdminWithdrawalMethod {
  const method = String(value ?? "").trim();
  if (ADMIN_WITHDRAWAL_METHODS.includes(method as AdminWithdrawalMethod)) {
    return method as AdminWithdrawalMethod;
  }

  throw new Error("اختر طريقة السحب اليدوي من الإدارة");
}

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

export async function adjustUserWalletAction(formData: FormData) {
  const admin = await requireSuperAdminPage();

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const operation = String(formData.get("operation") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim() || "Admin wallet adjustment";
  const adminWithdrawalMethod = operation === "PAYOUT"
    ? parseAdminWithdrawalMethod(formData.get("adminWithdrawalMethod"))
    : null;

  if (!tenantId || !userId || !["CREDIT", "DEBIT", "PAYOUT"].includes(operation)) {
    throw new Error("بيانات تعديل المحفظة غير صالحة");
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("المبلغ يجب أن يكون رقمًا صحيحًا موجبًا");
  }

  const user = await db.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("المستخدم غير موجود داخل هذا الحساب");
  }

  if (operation === "CREDIT") {
    await creditUserWallet({
      tenantId,
      userId,
      amount,
      reason,
      type: "ADMIN_ADJUSTMENT",
      createdById: admin.id,
      metadata: { direction: "CREDIT" },
    });
  } else if (operation === "DEBIT") {
    await debitUserWallet({
      tenantId,
      userId,
      amount,
      reason,
      type: "ADMIN_ADJUSTMENT",
      createdById: admin.id,
      metadata: { direction: operation },
    });
  } else {
    const withdrawal = await db.$transaction(async (tx) => {
      const wallet = await getOrCreateWallet(tenantId, userId, tx);
      const manualWithdrawal = await tx.walletWithdrawal.create({
        data: {
          tenantId,
          userId,
          walletId: wallet.id,
          amount,
          method: "ADMIN",
          adminMethod: adminWithdrawalMethod,
          status: "SUCCESS",
          attemptCount: 1,
          processedById: admin.id,
          processedAt: new Date(),
        },
      });

      await debitUserWallet({
        tenantId,
        userId,
        amount,
        reason,
        type: "PAYOUT",
        relatedWithdrawalId: manualWithdrawal.id,
        createdById: admin.id,
        metadata: {
          direction: "PAYOUT",
          withdrawalMethod: "ADMIN",
          adminMethod: adminWithdrawalMethod,
        },
        tx,
      });

      return manualWithdrawal;
    });

    await logFinancialEvent({
      tenantId,
      actorId: admin.id,
      eventType: "TRANSFER_SUCCESS",
      entityType: "TRANSFER",
      entityId: withdrawal.id,
      message: `Manual wallet withdrawal recorded (${adminWithdrawalMethod})`,
      metadata: { userId, amount, adminMethod: adminWithdrawalMethod },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/finance");
}
