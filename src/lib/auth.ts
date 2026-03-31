import { randomInt, randomUUID } from "node:crypto";

import type { UserRole } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getMockUserByPhone, getMockUserByToken } from "@/lib/mock-data";
import { getTenantFromHost } from "@/lib/tenant";

export type SessionUser = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: UserRole;
};

type VerifyOTPResult = {
  user: SessionUser;
  token: string;
};

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const DEV_OTP_CODE = "123456";

function generateOTPCode() {
  return DEV_OTP_CODE;
}

function toSessionUser(user: {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: UserRole;
}): SessionUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
}

async function resolveTenantForRequest() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  return getTenantFromHost(host);
}

function getFallbackUserByToken(token?: string | null) {
  if (!token) {
    return null;
  }

  return getMockUserByToken(token);
}

export async function sendOTP(phone: string) {
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  try {
    await db.oTP.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    console.log(`OTP for ${phone}: ${code}`);

    return { success: true as const };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("DB sendOTP failed, using mock:", error);
      console.log(`OTP for ${phone}: ${DEV_OTP_CODE}`);
      return { success: true as const };
    }
    throw error;
  }
}

export async function verifyOTP(phone: string, code: string): Promise<VerifyOTPResult> {
  const tenant = await resolveTenantForRequest();

  try {
    const now = new Date();
    const otpRecord = await db.oTP.findFirst({
      where: {
        phone,
        used: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new Error("OTP_NOT_FOUND");
    }

    if (otpRecord.attempts >= 3) {
      throw new Error("OTP_MAX_ATTEMPTS");
    }

    if (otpRecord.expiresAt < now) {
      throw new Error("OTP_EXPIRED");
    }

    if (otpRecord.code !== code) {
      await db.oTP.update({
        where: { id: otpRecord.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new Error("OTP_INVALID");
    }

    await db.oTP.update({
      where: { id: otpRecord.id },
      data: {
        used: true,
      },
    });

    const existingUser = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        phone,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    const user =
      existingUser ??
      (await db.user.create({
        data: {
          tenantId: tenant.id,
          phone,
          name: phone,
          role: "PARENT",
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          phone: true,
          role: true,
        },
      }));

    const token = randomUUID();

    await db.authSession.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        token,
        refreshToken: randomUUID(),
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
      },
    });

    return {
      user: toSessionUser(user),
      token,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("DB verifyOTP failed, using mock:", error);

      if (code !== DEV_OTP_CODE) {
        throw new Error("OTP_INVALID");
      }

      const mockUser = getMockUserByPhone(phone);
      const fallbackToken = `mock-session-${mockUser.role}`;

      return {
        user: mockUser,
        token: fallbackToken,
      };
    }
    throw error;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value ?? cookieStore.get("eduplatform-session")?.value;

  if (!token) {
    return null;
  }

  const tenant = await resolveTenantForRequest();

  try {
    const session = await db.authSession.findFirst({
      where: {
        tenantId: tenant.id,
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!session?.user) {
      return null;
    }

    return toSessionUser(session.user);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("DB getCurrentUser failed, using mock:", error);
      return getFallbackUserByToken(token);
    }
    console.error("DB getCurrentUser failed:", error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
