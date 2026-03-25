import { Plan, TenantAccountType } from "@prisma/client";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { extractTenantSlug } from "@/lib/tenant-host";

type HeaderReader = {
  get(name: string): string | null | undefined;
};

type TenantRequestLike = {
  headers?: HeaderReader;
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
  const forcedSlug = (await getHeaderValue(request, "x-tenant-slug"))?.toLowerCase();

  if (forcedSlug) {
    return getTenantBySlug(forcedSlug);
  }

  const host =
    (await getHeaderValue(request, "x-forwarded-host")) ??
    (await getHeaderValue(request, "host")) ??
    "localhost:3000";
  const slug = getTenantSlugFromHost(host);

  if (!slug) {
    return null;
  }

  return getTenantBySlug(slug);
}

export async function requireTenant(request?: TenantRequestLike) {
  const host =
    (await getHeaderValue(request, "x-forwarded-host")) ??
    (await getHeaderValue(request, "host")) ??
    "localhost:3000";
  const forcedSlug = (await getHeaderValue(request, "x-tenant-slug"))?.toLowerCase();
  const tenant = forcedSlug ? await getTenantBySlug(forcedSlug) : await getTenantFromHost(host);

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
