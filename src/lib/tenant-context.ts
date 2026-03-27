import { cookies } from "next/headers";

export const TENANT_CONTEXT_COOKIE_NAME = "eduplatform-tenant";

type CookieOptions = {
  sameSite: "lax";
  path: string;
  expires: Date;
};

type CookieStoreLike = {
  set: (name: string, value: string, options: CookieOptions) => unknown;
};

type ResponseLike = {
  cookies: CookieStoreLike;
};

export function setTenantContextCookie(cookieStore: Awaited<ReturnType<typeof cookies>>, tenantSlug: string, expiresAt: Date) {
  cookieStore.set(TENANT_CONTEXT_COOKIE_NAME, tenantSlug, {
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function applyTenantContextCookie(response: ResponseLike, tenantSlug: string, expiresAt: Date) {
  response.cookies.set(TENANT_CONTEXT_COOKIE_NAME, tenantSlug, {
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearTenantContextCookie(target: Awaited<ReturnType<typeof cookies>> | ResponseLike) {
  const cookieStore = "cookies" in target ? target.cookies : target;

  cookieStore.set(TENANT_CONTEXT_COOKIE_NAME, "", {
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
