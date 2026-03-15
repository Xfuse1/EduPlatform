'use server';

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { otpSchema, phoneSchema } from "@/modules/auth/validations";

type ActionResult = {
  success: boolean;
  message?: string;
  phone?: string;
  redirectTo?: string;
};

export async function sendOTP(formData: FormData): Promise<ActionResult> {
  const tenant = await requireTenant();
  const parsed = phoneSchema.safeParse(formData.get("phone"));

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "تعذر إرسال كود التحقق",
    };
  }

  const phone = parsed.data;

  await db.oTP.create({
    data: {
      phone,
      code: "123456",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  revalidatePath("/login");

  return {
    success: true,
    phone,
    redirectTo: `/verify?phone=${encodeURIComponent(phone)}`,
    message: `تم إرسال كود التحقق إلى <span dir="ltr">${phone}</span>`,
  };
}

export async function resendOTP(formData: FormData): Promise<ActionResult> {
  return sendOTP(formData);
}

export async function verifyOTPAction(formData: FormData): Promise<ActionResult> {
  const tenant = await requireTenant();
  const phoneResult = phoneSchema.safeParse(formData.get("phone"));
  const codeResult = otpSchema.safeParse(formData.get("code"));

  if (!phoneResult.success || !codeResult.success) {
    return {
      success: false,
      message: "يرجى إدخال كود تحقق صحيح",
    };
  }

  const otp = await db.oTP.findFirst({
    where: {
      phone: phoneResult.data,
      code: codeResult.data,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otp) {
    return {
      success: false,
      message: "كود التحقق غير صحيح أو منتهي الصلاحية",
    };
  }

  await db.oTP.update({
    where: {
      id: otp.id,
    },
    data: {
      used: true,
    },
  });

  const user = await db.user.findFirst({
    where: {
      tenantId: tenant.id,
      phone: phoneResult.data,
      isActive: true,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    return {
      success: false,
      message: "لا يوجد حساب مرتبط بهذا الرقم داخل هذا السنتر",
    };
  }

  const cookieStore = await cookies();
  const token = randomUUID();
  const refreshToken = randomUUID();

  await db.authSession.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      token,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

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
