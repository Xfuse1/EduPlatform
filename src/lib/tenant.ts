import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { MOCK_TENANT } from "@/lib/mock-data";

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  themeColor: string;
  region: string | null;
  bio: string | null;
  subjects: string[];
  plan: "FREE";
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
    return MOCK_TENANT;
  }

  return slug === MOCK_TENANT.slug ? MOCK_TENANT : MOCK_TENANT;
}

export async function requireTenant() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const forcedSlug = headerStore.get("x-tenant-slug") ?? MOCK_TENANT.slug;
  const tenant = forcedSlug === MOCK_TENANT.slug ? MOCK_TENANT : await getTenantFromHost(host);

  if (!tenant) {
    notFound();
  }

  return tenant;
}
