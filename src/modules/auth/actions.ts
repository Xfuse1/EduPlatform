'use server';

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { sendOTP as sendOTPRequest, verifyOTP } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { otpSchema, phoneSchema } from "@/modules/auth/validations";

type ActionResult = {
  success: boolean;
  message?: string;
  phone?: string;
  role?: "TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT";
  redirectTo?: string;
};

const redirectMap: Record<"TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT", string> = {
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
  ASSISTANT: "/teacher",
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

  try {
    await sendOTPRequest(phone);

    const cookieStore = await cookies();
    cookieStore.set("otp-phone", phone, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 10 * 60 * 1000),
    });

    revalidatePath("/login");

    return {
      success: true,
      phone,
      redirectTo: `/verify?phone=${encodeURIComponent(phone)}`,
      message: `تم إرسال كود التحقق إلى ${phone}`,
    };
  } catch (error) {
    console.error("sendOTP action failed:", error);

    return {
      success: false,
      message: "تعذر إرسال كود التحقق",
    };
  }
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

  try {
    const result = await verifyOTP(phoneResult.data, codeResult.data);
    const cookieStore = await cookies();

    cookieStore.set("auth-token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    cookieStore.delete("otp-phone");

    revalidatePath("/verify");

    return {
      success: true,
      role: result.user.role,
      redirectTo: redirectMap[result.user.role],
    };
  } catch (error) {
    console.error("verifyOTP action failed:", error);

    return {
      success: false,
      message: "كود التحقق غير صحيح أو منتهي الصلاحية",
    };
  }
}
