import { randomUUID } from "node:crypto";

import type { UserRole } from "@/generated/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { verifyFirebasePhoneIdToken } from "@/lib/firebase-admin";

export type SessionUser = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string | null;
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

export function applySessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: Date },
) {
  response.cookies.set("auth-token", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete("auth-token");
  response.cookies.delete("eduplatform-session");
}

function toSessionUser(user: {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string | null;
}): SessionUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
  };
}


export async function verifyOTP(phone: string, idToken: string, tenantId: string): Promise<VerifyOTPResult> {
  const verified = await verifyFirebasePhoneIdToken(idToken);

  if (verified.phoneNumber !== phone) {
    throw new Error("PHONE_MISMATCH");
  }

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

  try {
    const session = await db.authSession.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, tenantId: true, name: true, phone: true, role: true, avatarUrl: true },
        },
      },
    });

    if (!session?.user) return null;

    return toSessionUser(session.user);
  } catch (error) {
    console.error("DB getCurrentUser failed:", error);
    return null;
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function getSessionToken(
  request?: {
    cookies?: {
      get(name: string): { value: string } | undefined;
    };
  },
) {
  const requestToken =
    request?.cookies?.get("auth-token")?.value ??
    request?.cookies?.get("eduplatform-session")?.value;

  if (requestToken) {
    return requestToken;
  }

  const cookieStore = await cookies();
  return cookieStore.get("auth-token")?.value ?? cookieStore.get("eduplatform-session")?.value ?? null;
}

export async function requireAuth(request?: unknown) {
  const user = await getCurrentUser();

  if (!user) {
    if (request) {
      throw new UnauthorizedError();
    }

    redirect("/login");
  }

  return user;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value ?? cookieStore.get("eduplatform-session")?.value;
  if (!token) return null;

  try {
    const session = await db.authSession.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      select: { token: true, expiresAt: true, userId: true, tenantId: true },
    });
    return session ?? null;
  } catch {
    return null;
  }
}

export async function validateRequest() {
  const user = await getCurrentUser();
  const session = await getCurrentSession();
  return { user, session };
}
