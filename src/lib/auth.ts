import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type HeaderReader = {
  get(name: string): string | null | undefined;
};

type AuthRequestLike = {
  cookies?: CookieReader;
  headers?: HeaderReader;
};

export type SessionUser = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: "TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT";
};

const SESSION_COOKIE_NAME = "eduplatform-session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class UnauthorizedError extends Error {
  constructor(message = "يرجى تسجيل الدخول أولًا") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function parseCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [name, ...valueParts] = entry.split("=");
        return [name, decodeURIComponent(valueParts.join("="))] as const;
      }),
  );
}

async function getCookieValue(request?: AuthRequestLike) {
  if (request?.cookies) {
    return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  }

  if (request?.headers) {
    return parseCookieHeader(request.headers.get("cookie")).get(SESSION_COOKIE_NAME) ?? null;
  }

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function createAuthSession(user: { id: string; tenantId: string }) {
  const token = randomUUID();
  const refreshToken = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.authSession.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      token,
      refreshToken,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function setAuthSessionCookie(cookieStore: Awaited<ReturnType<typeof cookies>>, token: string, expiresAt: Date) {
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function applySessionCookie(
  response: { cookies: { set: (name: string, value: string, options: { httpOnly: boolean; sameSite: "lax"; path: string; expires: Date }) => unknown } },
  session: { token: string; expiresAt: Date },
) {
  response.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(response: { cookies: { set: (name: string, value: string, options: { httpOnly: boolean; sameSite: "lax"; path: string; expires: Date }) => unknown } }) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionToken(request?: AuthRequestLike) {
  return getCookieValue(request);
}

export async function getCurrentSession(request?: AuthRequestLike) {
  const token = await getSessionToken(request);

  if (!token) {
    return null;
  }

  const session = await db.authSession.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          tenantId: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || !session.user?.isActive) {
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    tenantId: session.tenantId,
    token: session.token,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  };
}

export async function getCurrentUser(request?: AuthRequestLike) {
  const token = await getSessionToken(request);

  if (!token) {
    return null;
  }

  const session = await db.authSession.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          tenantId: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || !session.user?.isActive) {
    return null;
  }

  return {
    id: session.user.id,
    tenantId: session.user.tenantId,
    name: session.user.name,
    phone: session.user.phone,
    role: session.user.role,
  } satisfies SessionUser;
}

export async function requireAuth(request?: AuthRequestLike) {
  const user = await getCurrentUser(request);

  if (!user) {
    if (request) {
      throw new UnauthorizedError();
    }

    redirect("/login");
  }

  return user as SessionUser;
}
