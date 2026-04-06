import { randomUUID } from "node:crypto";

import type { UserRole } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { verifyFirebasePhoneIdToken } from "@/lib/firebase-admin";
import { getMockUserByToken } from "@/lib/mock-data";
import { getTenantFromHost } from "@/lib/tenant";

export type SessionUser = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: UserRole;
};

type VerifyOTPResult = {
  user: SessionUser & { pinHash: string | null };
  token: string;
};

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function createAuthSession({ id, tenantId }: { id: string; tenantId: string }) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await db.authSession.create({
    data: {
      userId: id,
      tenantId,
      token,
      refreshToken: randomUUID(),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function setAuthSessionCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  token: string,
  expiresAt: Date,
) {
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
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
  if (!token) return null;
  return getMockUserByToken(token);
}

/**
 * Verifies a Firebase Phone ID token, then finds or creates the user,
 * and creates a DB session. Returns the session token.
 */
export async function verifyOTP(phone: string, idToken: string, tenantId: string): Promise<VerifyOTPResult> {
  // Verify with Firebase Admin
  const verified = await verifyFirebasePhoneIdToken(idToken);

  if (verified.phoneNumber !== phone) {
    throw new Error("PHONE_MISMATCH");
  }

  // Look up user scoped to the current tenant
  const existingUser = await db.user.findFirst({
    where: { phone, tenantId, isActive: true },
    select: { id: true, tenantId: true, name: true, phone: true, role: true, pinHash: true },
  });

  if (!existingUser) {
    throw new Error("USER_NOT_FOUND");
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await db.authSession.create({
    data: {
      userId: existingUser.id,
      tenantId: existingUser.tenantId,
      token,
      refreshToken: randomUUID(),
      expiresAt,
    },
  });

  return { user: existingUser, token };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value ?? cookieStore.get("eduplatform-session")?.value;

  if (!token) return null;

  const tenant = await resolveTenantForRequest();

  try {
    const session = await db.authSession.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, tenantId: true, name: true, phone: true, role: true },
        },
      },
    });

    if (!session?.user) return null;

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
