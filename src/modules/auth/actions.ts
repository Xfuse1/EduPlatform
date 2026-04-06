'use server';

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { createAuthSession, setAuthSessionCookie, verifyOTP } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyFirebasePhoneIdToken } from "@/lib/firebase-admin";
import { requireTenant } from "@/lib/tenant";
import { phoneSchema } from "@/modules/auth/validations";
import { getDashboardRouteForRole } from "@/modules/auth/queries";

type ActionResult = {
  success: boolean;
  message?: string;
  phone?: string;
  role?: "TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT";
  redirectTo?: string;
  hasPin?: boolean;
};

const redirectMap: Record<string, string> = {
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
  ASSISTANT: "/teacher",
  CENTER_ADMIN: "/center",
};

// Used by the API route: POST /api/auth/verify-otp
export async function verifyOtp(tenantId: string, payload: unknown) {
  const schema = z.object({
    phone: phoneSchema,
    idToken: z.string().trim().min(1),
  });

  const { phone, idToken } = schema.parse(payload);
  const verified = await verifyFirebasePhoneIdToken(idToken);

  if (verified.phoneNumber !== phone) {
    throw new Error("رقم الهاتف لا يطابق الكود المرسل");
  }

  const user = await db.user.findFirst({
    where: { phone, tenantId, isActive: true },
    select: { id: true, tenantId: true, name: true, phone: true, role: true },
  });

  if (!user) {
    throw new Error("لا يوجد حساب مرتبط بهذا الرقم في هذا السنتر");
  }

  const session = await createAuthSession({ id: user.id, tenantId: user.tenantId });
  const redirectTo = getDashboardRouteForRole(user.role);

  return { user, session, redirectTo };
}

export async function verifyOTPAction(formData: FormData): Promise<ActionResult> {
  const tenant = await requireTenant();
  const phoneResult = phoneSchema.safeParse(formData.get("phone"));
  const idTokenResult = z.string().trim().min(1).safeParse(formData.get("idToken"));

  if (!phoneResult.success || !idTokenResult.success) {
    return {
      success: false,
      message: "بيانات غير صالحة",
    };
  }

  const actualTenantId = formData.get("actualTenantId");
  const tenantId = (typeof actualTenantId === "string" && actualTenantId) ? actualTenantId : tenant.id;

  try {
    const result = await verifyOTP(phoneResult.data, idTokenResult.data, tenantId);
    const cookieStore = await cookies();

    cookieStore.set("auth-token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    revalidatePath("/verify");

    return {
      success: true,
      role: result.user.role,
      redirectTo: redirectMap[result.user.role] ?? "/teacher",
      hasPin: !!result.user.pinHash,
    };
  } catch (error) {
    console.error("verifyOTP action failed:", error);

    const err = error as { message?: string };
    if (err.message === "USER_NOT_FOUND") {
      return { success: false, message: "لا يوجد حساب مرتبط بهذا الرقم. يرجى التسجيل أولاً." };
    }
    if (err.message === "PHONE_MISMATCH") {
      return { success: false, message: "رقم الهاتف لا يطابق الكود المرسل" };
    }
    return {
      success: false,
      message: "تعذر التحقق من الهوية",
    };
  }
}
