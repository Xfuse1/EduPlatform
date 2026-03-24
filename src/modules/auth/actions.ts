'use server';

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { createAuthSession, setAuthSessionCookie, UnauthorizedError } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyFirebasePhoneIdToken } from "@/lib/firebase-admin";
import { normalizeEgyptPhone } from "@/lib/phone";
import { getOptionalTenant, getTenantBySlug } from "@/lib/tenant";
import { buildTenantVerifyUrl } from "@/lib/tenant-url";
import { getDashboardRouteForRole } from "@/modules/auth/queries";

type ActionResult = {
  success: boolean;
  message?: string;
  redirectTo?: string;
};

type LoginTarget =
  | {
      success: true;
      user: {
        id: string;
        tenantId: string;
        role: "TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT";
      };
      tenant: {
        id: string;
        slug: string;
      };
    }
  | {
      success: false;
      message: string;
    };

const loginCompletionSchema = z.object({
  idToken: z.string().trim().min(1, "يجب إتمام التحقق من رقم الهاتف أولًا"),
  tenantSlug: z.string().trim().optional(),
});

const preparePhoneLoginSchema = z.object({
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
  tenantSlug: z.string().trim().optional(),
});

const redirectMap: Record<"TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT", string> = {
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
  ASSISTANT: "/teacher",
};

const serverOtpSendSchema = z.object({
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
});

const serverOtpVerifySchema = z.object({
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
  code: z.string().trim().regex(/^\d{6}$/, "كود التحقق يجب أن يتكون من 6 أرقام"),
});

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_SECONDS = 60;

function normalizeLoginPhone(value: string) {
  const normalized = normalizeEgyptPhone(value);

  if (!/^01\d{9}$/.test(normalized)) {
    throw new UnauthorizedError("رقم الهاتف غير صحيح");
  }

  return normalized;
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function resolveLoginTargetByPhone(phone: string, tenantSlug?: string): Promise<LoginTarget> {
  const normalizedTenantSlug = tenantSlug?.trim().toLowerCase();

  if (normalizedTenantSlug) {
    const tenant = await getTenantBySlug(normalizedTenantSlug);

    if (!tenant || !tenant.isActive) {
      return {
        success: false,
        message: "الحساب المطلوب غير متاح حاليًا",
      };
    }

    const user = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        phone,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        role: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "لا يوجد حساب مرتبط بهذا الرقم داخل هذا الرابط",
      };
    }

    return {
      success: true,
      user,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
      },
    };
  }

  const requestTenant = await getOptionalTenant();

  if (requestTenant) {
    return resolveLoginTargetByPhone(phone, requestTenant.slug);
  }

  const users = await db.user.findMany({
    where: {
      phone,
      isActive: true,
      tenant: {
        isActive: true,
      },
    },
    select: {
      id: true,
      tenantId: true,
      role: true,
      tenant: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
    take: 2,
  });

  if (users.length === 0) {
    return {
      success: false,
      message: "لا يوجد حساب مرتبط بهذا الرقم",
    };
  }

  if (users.length > 1) {
    return {
      success: false,
      message: "هذا الرقم مرتبط بأكثر من حساب. استخدم رابط الحساب أو السنتر الخاص بك لتسجيل الدخول.",
    };
  }

  const [user] = users;

  return {
    success: true,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
    tenant: user.tenant,
  };
}

export async function sendOtp(tenantId: string, payload: unknown) {
  const parsed = serverOtpSendSchema.parse(payload);
  const phone = normalizeLoginPhone(parsed.phone);

  const user = await db.user.findFirst({
    where: {
      tenantId,
      phone,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError("لا يوجد حساب مرتبط بهذا الرقم داخل هذا الرابط");
  }

  const latestOtp = await db.oTP.findFirst({
    where: {
      phone,
      used: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const resendAt = latestOtp ? latestOtp.createdAt.getTime() + OTP_RESEND_SECONDS * 1000 : 0;

  if (latestOtp && resendAt > Date.now()) {
    return {
      success: true,
      phone,
      expiresAt: latestOtp.expiresAt,
      resendAfterSeconds: Math.max(Math.ceil((resendAt - Date.now()) / 1000), 1),
    };
  }

  const code = createOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.oTP.create({
    data: {
      phone,
      code,
      expiresAt,
    },
  });

  console.info(`[auth/send-otp] ${phone}: ${code}`);

  return {
    success: true,
    phone,
    expiresAt,
    resendAfterSeconds: OTP_RESEND_SECONDS,
  };
}

export async function verifyOtp(tenantId: string, payload: unknown) {
  const parsed = serverOtpVerifySchema.parse(payload);
  const phone = normalizeLoginPhone(parsed.phone);

  const otp = await db.oTP.findFirst({
    where: {
      phone,
      code: parsed.code,
      used: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otp) {
    throw new UnauthorizedError("كود التحقق غير صحيح");
  }

  if (otp.expiresAt <= new Date()) {
    await db.oTP.update({
      where: {
        id: otp.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    throw new UnauthorizedError("انتهت صلاحية كود التحقق");
  }

  const user = await db.user.findFirst({
    where: {
      tenantId,
      phone,
      isActive: true,
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      phone: true,
      role: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError("لا يوجد حساب صالح مرتبط بهذا الرقم");
  }

  const session = await createAuthSession({
    id: user.id,
    tenantId: user.tenantId,
  });

  await Promise.all([
    db.oTP.update({
      where: {
        id: otp.id,
      },
      data: {
        used: true,
        attempts: {
          increment: 1,
        },
      },
    }),
    db.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    }),
  ]);

  return {
    user,
    redirectTo: getDashboardRouteForRole(user.role),
    session,
  };
}

export async function logout(token: string | null) {
  if (token) {
    await db.authSession.deleteMany({
      where: {
        token,
      },
    });
  }

  revalidatePath("/login");
  revalidatePath("/teacher");
  revalidatePath("/student");
  revalidatePath("/parent");

  return { success: true };
}

export async function completePhoneLogin(input: { idToken: string; tenantSlug?: string }): Promise<ActionResult> {
  const parsed = loginCompletionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "تعذر إكمال تسجيل الدخول",
    };
  }

  try {
    const verified = await verifyFirebasePhoneIdToken(parsed.data.idToken);
    const target = await resolveLoginTargetByPhone(verified.phoneNumber, parsed.data.tenantSlug);

    if (!target.success) {
      return target;
    }

    const cookieStore = await cookies();
    const session = await createAuthSession({
      id: target.user.id,
      tenantId: target.user.tenantId,
    });

    setAuthSessionCookie(cookieStore, session.token, session.expiresAt);

    revalidatePath("/verify");
    revalidatePath("/teacher");
    revalidatePath("/student");
    revalidatePath("/parent");

    return {
      success: true,
      redirectTo: redirectMap[target.user.role] ?? "/teacher",
    };
  } catch (error) {
    console.error("[complete-phone-login]", error);

    return {
      success: false,
      message: "تعذر التحقق من بيانات Firebase أو إنشاء الجلسة",
    };
  }
}

export async function preparePhoneLogin(input: { phone: string; tenantSlug?: string }): Promise<ActionResult> {
  const parsed = preparePhoneLoginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "تعذر تحديد صفحة التحقق",
    };
  }

  try {
    const phone = normalizeLoginPhone(parsed.data.phone);
    const target = await resolveLoginTargetByPhone(phone, parsed.data.tenantSlug);

    if (!target.success) {
      return target;
    }

    return {
      success: true,
      redirectTo: buildTenantVerifyUrl(target.tenant.slug, phone),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        message: error.message,
      };
    }

    console.error("[prepare-phone-login]", error);

    return {
      success: false,
      message: "تعذر تجهيز صفحة التحقق الآن",
    };
  }
}
