'use server';

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { createAuthSession, setAuthSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyFirebasePhoneIdToken } from "@/lib/firebase-admin";
import { normalizeEgyptPhone } from "@/lib/phone";
import { requireTenant } from "@/lib/tenant";
import { requireAuth } from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { phoneSchema } from "@/modules/auth/validations";
import { getDashboardRouteForRole } from "@/modules/auth/queries";
import { z } from "zod";

// PIN brute-force protection: max attempts per (tenant, phone) within the window.
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000;

const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "الـ PIN يجب أن يكون من 4 إلى 8 أرقام");

const redirectMap: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/center",
  MANAGER: "/center",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
  ASSISTANT: "/teacher",
  CENTER_ADMIN: "/center",
};

// Check if a phone number has a PIN set (called before showing login options).
// SECURITY: strictly scoped to the tenant resolved from host/cookie. We never
// search across tenants nor return another tenant's id, to avoid leaking which
// phones/accounts exist on the platform and which tenant they belong to.
export async function checkUserPin(
  phone: string,
): Promise<{ hasPin: boolean; exists: boolean }> {
  const tenant = await requireTenant();
  const parsed = phoneSchema.safeParse(phone);
  if (!parsed.success) return { hasPin: false, exists: false };

  const user = await db.user.findFirst({
    where: { phone: parsed.data, tenantId: tenant.id, isActive: true },
    select: { pinHash: true },
  });

  if (!user) return { hasPin: false, exists: false };

  return { hasPin: !!user.pinHash, exists: true };
}

// Verify PIN and create session.
// SECURITY: the session is always bound to the tenant resolved server-side
// (requireTenant); the client-supplied actualTenantId is ignored to prevent
// cross-tenant login / arbitrary-tenant session minting. Brute force is
// throttled per (tenant, phone).
export async function verifyPinAction(
  phone: string,
  pin: string,
  _actualTenantId?: string,
): Promise<{ success: boolean; message?: string; redirectTo?: string }> {
  const tenant = await requireTenant();

  const phoneResult = phoneSchema.safeParse(phone);
  const pinResult = pinSchema.safeParse(pin);

  if (!phoneResult.success) return { success: false, message: "رقم الهاتف غير صحيح" };
  if (!pinResult.success) return { success: false, message: pinResult.error.issues[0]?.message };

  const rlKey = `pin:${tenant.id}:${phoneResult.data}`;
  const rl = rateLimit(rlKey, PIN_MAX_ATTEMPTS, PIN_WINDOW_MS);
  if (!rl.allowed) {
    return {
      success: false,
      message: `محاولات كثيرة. يرجى المحاولة بعد ${Math.ceil(rl.retryAfterMs / 60000)} دقيقة`,
    };
  }

  const user = await db.user.findFirst({
    where: { phone: phoneResult.data, tenantId: tenant.id, isActive: true },
    select: { id: true, tenantId: true, name: true, phone: true, role: true, pinHash: true },
  });

  if (!user || !user.pinHash) {
    return { success: false, message: "لا يوجد PIN مفعّل لهذا الحساب" };
  }

  const isValid = await bcrypt.compare(pinResult.data, user.pinHash);
  if (!isValid) {
    return { success: false, message: "الـ PIN غير صحيح" };
  }

  // Successful login — clear the failure counter.
  resetRateLimit(rlKey);

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

const setPinWithOtpSchema = z.object({
  idToken: z.string().trim().min(1),
  pin: pinSchema,
});

export async function setPinWithOtpAction(
  input: z.infer<typeof setPinWithOtpSchema>,
): Promise<{ success: boolean; message?: string }> {
  const parsed = setPinWithOtpSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const user = await requireAuth();

  try {
    const verified = await verifyFirebasePhoneIdToken(parsed.data.idToken);

    if (verified.phoneNumber !== normalizeEgyptPhone(user.phone)) {
      return { success: false, message: "كود التحقق لا يطابق رقم هاتف الحساب الحالي" };
    }

    const hash = await bcrypt.hash(parsed.data.pin, 10);

    await db.user.update({
      where: { id: user.id },
      data: { pinHash: hash },
    });

    return { success: true, message: "تم حفظ الـ PIN بنجاح" };
  } catch (error) {
    console.error("setPinWithOtpAction failed:", error);
    return { success: false, message: "تعذر التحقق من كود الهاتف حاليا" };
  }
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
