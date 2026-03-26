'use server';

import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { z } from "zod";

import { createAuthSession, setAuthSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyFirebasePhoneIdToken } from "@/lib/firebase-admin";
import { setTenantContextCookie } from "@/lib/tenant-context";
import { buildAbsoluteAppUrl, buildTenantLoginUrl } from "@/lib/tenant-url";
import { getDashboardRouteForRole } from "@/modules/auth/queries";

const RESERVED_SUBDOMAINS = new Set(["ahmed", "noor", "test", "admin", "www", "app"]);
const accountTypeSchema = z.enum(["CENTER", "TEACHER"]);

const teacherSignupSchema = z
  .object({
    accountType: accountTypeSchema,
    centerName: z.string().trim().optional(),
    teacherName: z.string().trim().min(3, "يرجى إدخال اسم المدرس كاملًا بحد أدنى 3 أحرف"),
    phone: z.string().trim().regex(/^01\d{9}$/, "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01"),
    subject: z.string().trim().optional(),
    governorate: z.string().trim().min(2, "يرجى إدخال المحافظة"),
    subdomain: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "يجب أن يكون اسم الحساب بين 3 و20 حرفًا")
      .max(20, "يجب أن يكون اسم الحساب بين 3 و20 حرفًا")
      .regex(/^[a-z0-9-]+$/, "يجب أن يحتوي الرابط على حروف إنجليزية وأرقام فقط"),
    idToken: z.string().trim().min(1, "يجب التحقق من رقم الهاتف أولًا"),
  })
  .superRefine((value, ctx) => {
    if (value.accountType === "CENTER" && (!value.centerName || value.centerName.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["centerName"],
        message: "يرجى إدخال اسم السنتر بحد أدنى 3 أحرف",
      });
    }

    if (value.accountType === "TEACHER" && (!value.subject || value.subject.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subject"],
        message: "يرجى إدخال المادة الدراسية",
      });
    }
  });

const parentSignupSchema = z.object({
  parentName: z.string().trim().min(3, "يرجى إدخال اسم ولي الأمر كاملًا بحد أدنى 3 أحرف"),
  phone: z.string().trim().regex(/^01\d{9}$/, "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01"),
  idToken: z.string().trim().min(1, "يجب التحقق من رقم الهاتف أولًا"),
});

type CreateTeacherSignupInput = z.infer<typeof teacherSignupSchema>;
type CreateParentSignupInput = z.infer<typeof parentSignupSchema>;
type TeacherAccountType = z.infer<typeof accountTypeSchema>;
type TeacherSignupActionResult =
  | {
      success: false;
      message: string;
      accessUrl?: undefined;
      redirectTo?: undefined;
      tenantName?: undefined;
      tenantSlug?: undefined;
      accountType?: undefined;
    }
  | {
      success: true;
      message: string;
      accessUrl: string;
      redirectTo: string;
      tenantName: string;
      tenantSlug: string;
      accountType: TeacherAccountType;
    };

type ParentSignupActionResult =
  | {
      success: false;
      message: string;
      accessUrl?: string;
      redirectTo?: string;
      tenantName?: string;
      tenantSlug?: string;
      accountType?: "PARENT";
    }
  | {
      success: true;
      message: string;
      accessUrl: string;
      redirectTo: string;
      tenantName: string;
      tenantSlug: string;
      accountType: "PARENT";
    };

function buildStandaloneParentSlug(phone: string) {
  return `parent-${phone.slice(-4)}-${randomUUID().slice(0, 6).toLowerCase()}`;
}

function isPrismaInitializationError(error: unknown): error is { name: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string" &&
    error.name === "PrismaClientInitializationError"
  );
}

function isPrismaKnownRequestError(error: unknown): error is { code: string; name: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string" &&
    error.name === "PrismaClientKnownRequestError" &&
    "code" in error &&
    typeof error.code === "string"
  );
}

function buildActionErrorMessage(error: unknown) {
  if (isPrismaInitializationError(error)) {
    return "قاعدة البيانات غير متاحة الآن. السبب الحقيقي ليس رفض البيانات، بل أن PostgreSQL غير متاح أو غير قابل للوصول.";
  }

  if (isPrismaKnownRequestError(error)) {
    return error.code === "P2002" ? "هذا الرابط مستخدم بالفعل" : "تعذر حفظ البيانات في قاعدة البيانات الآن.";
  }

  return "تعذر إنشاء الحساب الآن. حاول مرة أخرى بعد قليل.";
}

export async function createTeacherSignup(input: CreateTeacherSignupInput): Promise<TeacherSignupActionResult> {
  const parsed = teacherSignupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات إنشاء الحساب غير صحيحة",
    };
  }

  const payload = parsed.data;

  if (RESERVED_SUBDOMAINS.has(payload.subdomain)) {
    return {
      success: false,
      message: "هذا الاسم غير متاح حاليًا",
    };
  }

  try {
    const verified = await verifyFirebasePhoneIdToken(payload.idToken);

    if (verified.phoneNumber !== payload.phone) {
      return {
        success: false,
        message: "رقم الهاتف الموثق لا يطابق الرقم المدخل",
      };
    }

    const tenantDisplayName = payload.accountType === "CENTER" ? payload.centerName!.trim() : payload.teacherName;

    const account = await db.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          slug: payload.subdomain,
          name: tenantDisplayName,
          accountType: payload.accountType,
          phone: payload.phone,
          region: payload.governorate,
          subjects: payload.accountType === "CENTER" ? [] : [payload.subject!.trim()],
          isActive: true,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          accountType: true,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          phone: payload.phone,
          name: payload.teacherName,
          role: "TEACHER",
          isActive: true,
        },
        select: {
          id: true,
          tenantId: true,
          role: true,
        },
      });

      return {
        tenant: createdTenant,
        user: createdUser,
      };
    });

    const cookieStore = await cookies();
    const session = await createAuthSession({
      id: account.user.id,
      tenantId: account.user.tenantId,
    });

    setAuthSessionCookie(cookieStore, session.token, session.expiresAt);
    setTenantContextCookie(cookieStore, account.tenant.slug, session.expiresAt);

    return {
      success: true,
      message:
        payload.accountType === "CENTER"
          ? "تم إنشاء حساب السنتر وحساب المدرس المسؤول بنجاح."
          : "تم إنشاء حساب المدرس بنجاح.",
      accessUrl: await buildTenantLoginUrl(account.tenant.slug),
      redirectTo: await buildAbsoluteAppUrl(getDashboardRouteForRole(account.user.role)),
      tenantName: account.tenant.name,
      tenantSlug: account.tenant.slug,
      accountType: payload.accountType,
    };
  } catch (error) {
    console.error("[teacher-signup][create-account]", error);

    return {
      success: false,
      message: buildActionErrorMessage(error),
    };
  }
}

export async function createParentSignup(input: CreateParentSignupInput): Promise<ParentSignupActionResult> {
  const parsed = parentSignupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات إنشاء حساب ولي الأمر غير صحيحة",
    };
  }

  const payload = parsed.data;

  try {
    const verified = await verifyFirebasePhoneIdToken(payload.idToken);

    if (verified.phoneNumber !== payload.phone) {
      return {
        success: false,
        message: "رقم الهاتف الموثق لا يطابق الرقم المدخل",
      };
    }

    const existingParentAccount = await db.user.findFirst({
      where: {
        phone: payload.phone,
        role: "PARENT",
        isActive: true,
        tenant: {
          isActive: true,
          accountType: "PARENT",
        },
      },
      select: {
        id: true,
        tenantId: true,
        tenant: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

    if (existingParentAccount) {
      const cookieStore = await cookies();
      const session = await createAuthSession({
        id: existingParentAccount.id,
        tenantId: existingParentAccount.tenantId,
      });

      setAuthSessionCookie(cookieStore, session.token, session.expiresAt);
      setTenantContextCookie(cookieStore, existingParentAccount.tenant.slug, session.expiresAt);

      return {
        success: false,
        message: "يوجد حساب ولي أمر مستقل بالفعل لهذا الرقم. استخدم رابط الدخول الحالي.",
        accessUrl: await buildTenantLoginUrl(existingParentAccount.tenant.slug),
        redirectTo: await buildAbsoluteAppUrl(getDashboardRouteForRole("PARENT")),
        tenantName: existingParentAccount.tenant.name,
        tenantSlug: existingParentAccount.tenant.slug,
        accountType: "PARENT",
      };
    }

    const account = await db.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          slug: buildStandaloneParentSlug(payload.phone),
          name: payload.parentName,
          accountType: "PARENT",
          phone: payload.phone,
          subjects: [],
          isActive: true,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          accountType: true,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          phone: payload.phone,
          name: payload.parentName,
          role: "PARENT",
          parentName: payload.parentName,
          parentPhone: payload.phone,
          isActive: true,
        },
        select: {
          id: true,
          tenantId: true,
          role: true,
        },
      });

      return {
        tenant: createdTenant,
        user: createdUser,
      };
    });

    const cookieStore = await cookies();
    const session = await createAuthSession({
      id: account.user.id,
      tenantId: account.user.tenantId,
    });

    setAuthSessionCookie(cookieStore, session.token, session.expiresAt);
    setTenantContextCookie(cookieStore, account.tenant.slug, session.expiresAt);

    return {
      success: true,
      message: "تم إنشاء حساب ولي الأمر المستقل بنجاح.",
      accessUrl: await buildTenantLoginUrl(account.tenant.slug),
      redirectTo: await buildAbsoluteAppUrl(getDashboardRouteForRole(account.user.role)),
      tenantName: account.tenant.name,
      tenantSlug: account.tenant.slug,
      accountType: "PARENT",
    };
  } catch (error) {
    console.error("[parent-signup][create-account]", error);

    return {
      success: false,
      message: buildActionErrorMessage(error),
    };
  }
}
