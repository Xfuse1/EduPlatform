import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { db } from "@/lib/db";

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  themeColor: string;
  region: string | null;
  bio: string | null;
  subjects: string[];
};

export async function getTenantFromHost(host: string) {
  const hostname = host.split(":")[0].trim().toLowerCase();
  const parts = hostname.split(".");

  let slug = "";

  if (hostname.endsWith(".localhost")) {
    slug = parts[0] ?? "";
  } else if (parts.length > 2) {
    slug = parts[0] ?? "";
  }

  if (!slug || slug === "www" || slug === "app") {
    return null;
  }

  return db.tenant.findFirst({
    where: {
      slug,
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      themeColor: true,
      region: true,
      bio: true,
      subjects: true,
    },
  });
}

export async function requireTenant() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "";
  const forcedSlug = headerStore.get("x-tenant-slug");

  const tenant = forcedSlug
    ? await db.tenant.findFirst({
        where: {
          slug: forcedSlug,
          isActive: true,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          themeColor: true,
          region: true,
          bio: true,
          subjects: true,
        },
      })
    : await getTenantFromHost(host);

  if (!tenant) {
    notFound();
  }

  return tenant;
}
