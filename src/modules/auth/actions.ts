'use server';

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getMockUserByPhone } from "@/lib/mock-data";
import { requireTenant } from "@/lib/tenant";
import { otpSchema, phoneSchema } from "@/modules/auth/validations";

type ActionResult = {
  success: boolean;
  message?: string;
  phone?: string;
  redirectTo?: string;
};

export async function sendOTP(formData: FormData): Promise<ActionResult> {
  await requireTenant();
  const parsed = phoneSchema.safeParse(formData.get("phone"));

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "تعذر إرسال كود التحقق",
    };
  }

  const phone = parsed.data;

  revalidatePath("/login");

  return {
    success: true,
    phone,
    redirectTo: `/verify?phone=${encodeURIComponent(phone)}`,
    message: `تم إرسال كود التحقق إلى ${phone}`,
  };
}

export async function resendOTP(formData: FormData): Promise<ActionResult> {
  return sendOTP(formData);
}

export async function verifyOTPAction(formData: FormData): Promise<ActionResult> {
  await requireTenant();
  const phoneResult = phoneSchema.safeParse(formData.get("phone"));
  const codeResult = otpSchema.safeParse(formData.get("code"));

  if (!phoneResult.success || !codeResult.success) {
    return {
      success: false,
      message: "يرجى إدخال كود تحقق صحيح",
    };
  }

  if (codeResult.data !== "123456") {
    return {
      success: false,
      message: "كود التحقق غير صحيح أو منتهي الصلاحية",
    };
  }

  const user = getMockUserByPhone(phoneResult.data);
  const cookieStore = await cookies();
  const token = `mock-session-${user.role}`;

  cookieStore.set("eduplatform-session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const redirectMap: Record<string, string> = {
    TEACHER: "/teacher",
    STUDENT: "/student",
    PARENT: "/parent",
    ASSISTANT: "/teacher",
  };

  revalidatePath("/verify");

  return {
    success: true,
    redirectTo: redirectMap[user.role] ?? "/teacher",
  };
}
