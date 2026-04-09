'use server';

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";

import { createAuthSession, setAuthSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyFirebasePhoneIdToken } from "@/lib/firebase-admin";

const RESERVED_SUBDOMAINS = new Set(["ahmed", "noor", "test", "admin", "www", "app"]);

const teacherSignupSchema = z.object({
  teacherName: z.string().trim().min(3, "يرجى إدخال اسم المدرس كاملًا بحد أدنى 3 أحرف"),
  phone: z.string().trim().regex(/^01\d{9}$/, "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01"),
  subject: z.string().trim().min(1, "يرجى إدخال المادة الدراسية"),
  governorate: z.string().trim().min(2, "يرجى إدخال المحافظة"),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "يجب أن يكون اسم الحساب بين 3 و20 حرفًا")
    .max(20, "يجب أن يكون اسم الحساب بين 3 و20 حرفًا")
    .regex(/^[a-z0-9-]+$/, "يجب أن يحتوي الرابط على حروف إنجليزية وأرقام فقط"),
  idToken: z.string().trim().min(1, "يجب التحقق من رقم الهاتف أولًا"),
});

type TeacherSignupInput = z.infer<typeof teacherSignupSchema>;

type TeacherSignupResult =
  | { success: false; message: string }
  | { success: true; message: string; redirectTo: string };

export async function createTeacherSignup(input: TeacherSignupInput): Promise<TeacherSignupResult> {
  const parsed = teacherSignupSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const payload = parsed.data;

  if (RESERVED_SUBDOMAINS.has(payload.subdomain)) {
    return { success: false, message: "هذا الاسم غير متاح حاليًا" };
  }

  // Verify Firebase ID token
  const verified = await verifyFirebasePhoneIdToken(payload.idToken);

  if (verified.phoneNumber !== payload.phone) {
    return { success: false, message: "رقم الهاتف الموثق لا يطابق الرقم المدخل" };
  }

  try {
    // Check subdomain availability
    const existingTenant = await db.tenant.findUnique({ where: { slug: payload.subdomain } });
    if (existingTenant) {
      return { success: false, message: "هذا الرابط مستخدم بالفعل" };
    }

    const account = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: payload.subdomain,
          name: payload.teacherName,
          phone: payload.phone,
          region: payload.governorate,
          subjects: [payload.subject],
          isActive: true,
        },
        select: { id: true, slug: true, name: true },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          phone: payload.phone,
          name: payload.teacherName,
          role: "TEACHER",
          isActive: true,
        },
        select: { id: true, tenantId: true },
      });

      return { tenant, user };
    });

    const cookieStore = await cookies();
    const session = await createAuthSession({ id: account.user.id, tenantId: account.user.tenantId });
    setAuthSessionCookie(cookieStore, session.token, session.expiresAt);

    return {
      success: true,
      message: "تم إنشاء الحساب بنجاح!",
      redirectTo: "/teacher",
    };
  } catch (error) {
    console.error("[teacher-signup]", error);
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return { success: false, message: "هذا الرقم أو الرابط مستخدم بالفعل" };
    }
    return { success: false, message: "تعذر إنشاء الحساب. حاول مرة أخرى بعد قليل." };
  }
}

const parentSignupSchema = z.object({
  parentName: z.string().trim().min(3, "يرجى إدخال اسم ولي الأمر كاملًا بحد أدنى 3 أحرف"),
  phone: z.string().trim().regex(/^01\d{9}$/, "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01"),
  idToken: z.string().trim().min(1, "يجب التحقق من رقم الهاتف أولًا"),
});

type ParentSignupResult = {
  success: boolean;
  message?: string;
  redirectTo?: string;
  accessUrl?: string;
  tenantName?: string;
};

function isTransientDatabaseError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : String(error);

  return (
    code === "P1001" ||
    code === "P1017" ||
    message.includes("ConnectionReset") ||
    message.includes("forcibly closed by the remote host")
  );
}
const BASE_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "eduplatform.com";

export async function createParentSignup(input: z.infer<typeof parentSignupSchema>): Promise<ParentSignupResult> {
  const parsed = parentSignupSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const { parentName, phone, idToken } = parsed.data;

  const verified = await verifyFirebasePhoneIdToken(idToken);
  if (verified.phoneNumber !== phone) {
    return { success: false, message: "رقم الهاتف الموثق لا يطابق الرقم المدخل" };
  }

  try {
    // Check if this phone already has a PARENT user
    const existing = await db.user.findFirst({
      where: { phone, role: "PARENT", isActive: true },
      select: { id: true, tenantId: true, tenant: { select: { slug: true, name: true } } },
    });

    if (existing) {
      const accessUrl = `${existing.tenant.slug}.${BASE_DOMAIN}/login`;
      const cookieStore = await cookies();
      const session = await createAuthSession({ id: existing.id, tenantId: existing.tenantId });
      setAuthSessionCookie(cookieStore, session.token, session.expiresAt);

      return {
        success: false,
        message: "يوجد حساب ولي أمر مرتبط بهذا الرقم بالفعل. تم تسجيل دخولك تلقائيًا.",
        redirectTo: "/parent",
        accessUrl,
        tenantName: existing.tenant.name,
      };
    }

    // Generate unique parent slug
    const suffix = randomBytes(4).toString("hex");
    const slug = `parent-${suffix}`;

    const account = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: parentName,
          phone,
          isActive: true,
        },
        select: { id: true, slug: true, name: true },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          phone,
          name: parentName,
          role: "PARENT",
          isActive: true,
        },
        select: { id: true, tenantId: true },
      });

      return { tenant, user };
    });

    const cookieStore = await cookies();
    const session = await createAuthSession({ id: account.user.id, tenantId: account.user.tenantId });
    setAuthSessionCookie(cookieStore, session.token, session.expiresAt);

    return {
      success: true,
      message: "تم إنشاء حساب ولي الأمر بنجاح. يمكنك الآن الدخول ومتابعة أبنائك.",
      redirectTo: "/parent",
      accessUrl: `${account.tenant.slug}.${BASE_DOMAIN}/login`,
      tenantName: account.tenant.name,
    };
  } catch (error) {
    console.error("[parent-signup]", error);
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return { success: false, message: "هذا الرقم مستخدم بالفعل" };
    }
    return { success: false, message: "تعذر إنشاء الحساب. حاول مرة أخرى بعد قليل." };
  }
}

export async function checkSubdomainAvailability(subdomain: string): Promise<{ available: boolean; message?: string }> {
  const normalized = subdomain.trim().toLowerCase();

  if (RESERVED_SUBDOMAINS.has(normalized)) {
    return { available: false, message: "هذا الاسم غير متاح حاليًا" };
  }

  const findExistingTenant = () => db.tenant.findUnique({ where: { slug: normalized } });

  try {
    const existing = await findExistingTenant();
    if (existing) {
      return { available: false, message: "هذا الرابط مستخدم بالفعل" };
    }

    return { available: true };
  } catch (error) {
    if (isTransientDatabaseError(error)) {
      try {
        const existing = await findExistingTenant();
        if (existing) {
          return { available: false, message: "هذا الرابط مستخدم بالفعل" };
        }

        return { available: true };
      } catch (retryError) {
        console.error("[check-subdomain-availability:retry]", retryError);
      }
    } else {
      console.error("[check-subdomain-availability]", error);
    }

    return { available: false, message: "تعذر التحقق من الرابط الآن. حاول مرة أخرى بعد قليل." };
  }
}