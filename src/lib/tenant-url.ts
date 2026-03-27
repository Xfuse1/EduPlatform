import { headers } from "next/headers";

import { normalizeHost } from "@/lib/tenant-host";

const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function shouldUseHttpProtocol(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

async function getRequestOrigin() {
  try {
    const headerStore = await headers();
    const host = normalizeHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "");

    if (host) {
      const protocol = headerStore.get("x-forwarded-proto") ?? (shouldUseHttpProtocol(host) ? "http" : "https");
      return `${protocol}://${host}`;
    }
  } catch {}

  return DEFAULT_APP_URL;
}

export async function buildAbsoluteAppUrl(pathname: string, searchParams?: Record<string, string | undefined>) {
  const url = new URL(pathname, await getRequestOrigin());
  url.search = "";
  url.hash = "";

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

export async function buildTenantAbsoluteUrl(
  slug: string,
  pathname: string,
  searchParams?: Record<string, string | undefined>,
) {
  return buildAbsoluteAppUrl(pathname, {
    ...searchParams,
    tenantSlug: slug,
  });
}

export async function buildTenantLoginUrl(slug: string) {
  return buildTenantAbsoluteUrl(slug, "/login");
}

export async function buildTenantVerifyUrl(slug: string, phone: string) {
  return buildTenantAbsoluteUrl(slug, "/verify", {
    phone,
  });
}
