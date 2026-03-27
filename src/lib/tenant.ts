import { Plan, TenantAccountType } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { TENANT_CONTEXT_COOKIE_NAME } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { extractTenantSlug } from "@/lib/tenant-host";

type HeaderReader = {
  get(name: string): string | null | undefined;
};

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type TenantRequestLike = {
  headers?: HeaderReader;
  cookies?: CookieReader;
};

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  themeColor: string;
  region: string | null;
  bio: string | null;
  subjects: string[];
  plan: Plan;
  phone: string | null;
  isActive: boolean;
  accountType: TenantAccountType;
};

export class TenantNotFoundError extends Error {
  constructor(message = "السنتر المطلوب غير موجود") {
    super(message);
    this.name = "TenantNotFoundError";
  }
}

export class InactiveTenantError extends Error {
  constructor(message = "السنتر المطلوب غير مفعل حاليًا") {
    super(message);
    this.name = "InactiveTenantError";
  }
}

function getTenantSlugFromHost(host: string) {
  return extractTenantSlug(host);
}

async function getHeaderValue(request: TenantRequestLike | undefined, name: string) {
  if (request?.headers) {
    return request.headers.get(name)?.trim() ?? null;
  }

  const headerStore = await headers();
  return headerStore.get(name)?.trim() ?? null;
}

async function getCookieValue(request: TenantRequestLike | undefined, name: string) {
  if (request?.cookies) {
    return request.cookies.get(name)?.value?.trim() ?? null;
  }

  const cookieStore = await cookies();
  return cookieStore.get(name)?.value?.trim() ?? null;
}

async function resolveTenantSlug(request?: TenantRequestLike) {
  const forcedSlug = (await getHeaderValue(request, "x-tenant-slug"))?.toLowerCase();

  if (forcedSlug) {
    return forcedSlug;
  }

  const host =
    (await getHeaderValue(request, "x-forwarded-host")) ??
    (await getHeaderValue(request, "host")) ??
    "localhost:3000";
  const hostSlug = getTenantSlugFromHost(host);

  if (hostSlug) {
    return hostSlug;
  }

  return (await getCookieValue(request, TENANT_CONTEXT_COOKIE_NAME))?.toLowerCase() ?? "";
}

export async function getTenantBySlug(slug: string) {
  return db.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      themeColor: true,
      region: true,
      bio: true,
      subjects: true,
      plan: true,
      phone: true,
      isActive: true,
      accountType: true,
    },
  });
}

export async function getTenantFromHost(host: string) {
  const slug = getTenantSlugFromHost(host);

  if (!slug) {
    return null;
  }

  return getTenantBySlug(slug);
}

export async function getOptionalTenant(request?: TenantRequestLike) {
  const slug = await resolveTenantSlug(request);

  if (!slug) {
    return null;
  }

  return getTenantBySlug(slug);
}

export async function requireTenant(request?: TenantRequestLike) {
  const slug = await resolveTenantSlug(request);
  const tenant = slug ? await getTenantBySlug(slug) : null;

  if (!tenant) {
    if (request) {
      throw new TenantNotFoundError();
    }

    notFound();
  }

  if (!tenant.isActive) {
    if (request) {
      throw new InactiveTenantError();
    }

    notFound();
  }

  return tenant;
}
