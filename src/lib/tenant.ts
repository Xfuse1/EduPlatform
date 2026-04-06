import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { MOCK_TENANT } from "@/lib/mock-data";

export class TenantNotFoundError extends Error {
  constructor() {
    super("Tenant not found");
    this.name = "TenantNotFoundError";
  }
}

export class InactiveTenantError extends Error {
  constructor() {
    super("Tenant is inactive");
    this.name = "InactiveTenantError";
  }
}

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  accountType?: "CENTER" | "TEACHER";
  themeColor: string;
  plan: "FREE" | "BASIC" | "PRO" | "BUSINESS";
  isActive: boolean;
  smsQuota: number;
  logoUrl: string | null;
  phone: string | null;
  region: string | null;
  bio: string | null;
  subjects: string[];
};

const SPECIAL_SUBDOMAINS = new Set(["www", "app", "api", "localhost"]);

const FALLBACK_TENANT: ResolvedTenant = {
  ...MOCK_TENANT,
  accountType: "CENTER",
  isActive: true,
  smsQuota: 50,
  phone: null,
};

function extractSubdomain(host: string) {
  const hostname = host.trim().toLowerCase().split(":")[0] ?? "";

  if (hostname.endsWith(".localhost")) {
    return hostname.split(".")[0] ?? "";
  }

  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts[0] ?? "";
  }

  return hostname;
}

const findTenantByHost = cache(async (host: string): Promise<ResolvedTenant> => {
  const subdomain = extractSubdomain(host)
    .replace(":3000", "")
    .replace(":3001", "");

  try {
    if (!subdomain || SPECIAL_SUBDOMAINS.has(subdomain) || subdomain.includes("vercel")) {
      const defaultTenant = await db.tenant.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          slug: true,
          name: true,
          themeColor: true,
          plan: true,
          isActive: true,
          smsQuota: true,
          logoUrl: true,
          phone: true,
          region: true,
          bio: true,
          subjects: true,
        },
      });

      if (defaultTenant) {
        return {
          ...defaultTenant,
          accountType: "CENTER",
        };
      }

      return FALLBACK_TENANT;
    }

    const tenant = await db.tenant.findFirst({
      where: {
        slug: subdomain,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        themeColor: true,
        plan: true,
        isActive: true,
        smsQuota: true,
        logoUrl: true,
        phone: true,
        region: true,
        bio: true,
        subjects: true,
      },
    });

    if (tenant) {
      return {
        ...tenant,
        accountType: "CENTER",
      };
    }
  } catch (error) {
    console.error("DB tenant lookup failed, using mock:", error);
  }

  return FALLBACK_TENANT;
});

export async function getTenantFromHost(host: string) {
  return findTenantByHost(host);
}

export async function getTenantBySlug(slug: string) {
  try {
    const tenant = await db.tenant.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        themeColor: true,
        plan: true,
        isActive: true,
        smsQuota: true,
        logoUrl: true,
        phone: true,
        region: true,
        bio: true,
        subjects: true,
      },
    });

    if (!tenant) {
      return null;
    }

    return {
      ...tenant,
      accountType: "CENTER" as const,
    };
  } catch {
    return null;
  }
}

export async function requireTenant() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const tenant = await getTenantFromHost(host);

  if (!tenant) {
    notFound();
  }

  return tenant;
}