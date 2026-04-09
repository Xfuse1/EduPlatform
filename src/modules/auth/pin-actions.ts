'use server';

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { createAuthSession, setAuthSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { requireAuth } from "@/lib/auth";
import { phoneSchema } from "@/modules/auth/validations";
import { getDashboardRouteForRole } from "@/modules/auth/queries";
import { z } from "zod";

const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "الـ PIN يجب أن يكون من 4 إلى 8 أرقام");

const redirectMap: Record<string, string> = {
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
  ASSISTANT: "/teacher",
  CENTER_ADMIN: "/center",
};

// Check if a phone number has a PIN set (called before showing login options)
export async function checkUserPin(
  phone: string,
): Promise<{ hasPin: boolean; exists: boolean; actualTenantId?: string }> {
  const tenant = await requireTenant();
  const parsed = phoneSchema.safeParse(phone);
  if (!parsed.success) return { hasPin: false, exists: false };

  // Search in current tenant first
  const user = await db.user.findFirst({
    where: { phone: parsed.data, tenantId: tenant.id, isActive: true },
    select: { pinHash: true },
  });

  if (user) return { hasPin: !!user.pinHash, exists: true };

  // Not found in current tenant — search across all tenants
  const userElsewhere = await db.user.findFirst({
    where: { phone: parsed.data, isActive: true },
    select: { pinHash: true, tenantId: true },
  });

  if (!userElsewhere) return { hasPin: false, exists: false };

  // Return the actual tenantId so login can proceed in the correct tenant
  return { hasPin: !!userElsewhere.pinHash, exists: true, actualTenantId: userElsewhere.tenantId };
}

// Verify PIN and create session
export async function verifyPinAction(
  phone: string,
  pin: string,
  actualTenantId?: string,
): Promise<{ success: boolean; message?: string; redirectTo?: string }> {
  const tenant = await requireTenant();
  const tenantId = actualTenantId ?? tenant.id;

  const phoneResult = phoneSchema.safeParse(phone);
  const pinResult = pinSchema.safeParse(pin);

  if (!phoneResult.success) return { success: false, message: "رقم الهاتف غير صحيح" };
  if (!pinResult.success) return { success: false, message: pinResult.error.issues[0]?.message };

  const user = await db.user.findFirst({
    where: { phone: phoneResult.data, tenantId, isActive: true },
    select: { id: true, tenantId: true, name: true, phone: true, role: true, pinHash: true },
  });

  if (!user || !user.pinHash) {
    return { success: false, message: "لا يوجد PIN مفعّل لهذا الحساب" };
  }

  const isValid = await bcrypt.compare(pinResult.data, user.pinHash);
  if (!isValid) {
    return { success: false, message: "الـ PIN غير صحيح" };
  }

  const cookieStore = await cookies();
  const session = await createAuthSession({ id: user.id, tenantId: user.tenantId });
  setAuthSessionCookie(cookieStore, session.token, session.expiresAt);

  return {
    success: true,
    redirectTo: redirectMap[user.role] ?? "/teacher",
  };
}

// Set PIN for the currently logged-in user
export async function setPinAction(
  pin: string,
): Promise<{ success: boolean; message?: string }> {
  const pinResult = pinSchema.safeParse(pin);
  if (!pinResult.success) return { success: false, message: pinResult.error.issues[0]?.message };

  const user = await requireAuth();
  const hash = await bcrypt.hash(pinResult.data, 10);

  await db.user.update({
    where: { id: user.id },
    data: { pinHash: hash },
  });

  return { success: true, message: "تم تفعيل الـ PIN بنجاح" };
}

// Remove PIN
export async function removePinAction(): Promise<{ success: boolean; message?: string }> {
  const user = await requireAuth();

  await db.user.update({
    where: { id: user.id },
    data: { pinHash: null },
  });

  return { success: true, message: "تم إلغاء الـ PIN" };
}
