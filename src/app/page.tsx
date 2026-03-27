export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { extractTenantSlug, normalizeHost } from "@/lib/tenant-host";
import type { ResolvedTenant } from "@/lib/tenant";
import MarketingPage from "@/modules/marketing/components/MarketingPage";
import TenantPublicPage from "@/modules/public-pages/components/TenantPublicPage";

type TeacherPublicProfile = {
  id: string;
  name: string;
  logoUrl: string | null;
  themeColor: string;
  region: string | null;
  bio: string | null;
  subjects: string[];
};

type PublicGroup = {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  room: string | null;
  days: string[];
  timeStart: string;
  timeEnd: string;
  monthlyFee: number;
  maxCapacity: number;
  enrolledCount: number;
  remainingCapacity: number;
  color: string | null;
  isFull: boolean;
};

type TenantLandingPayload = {
  tenant: ResolvedTenant;
  teacher: TeacherPublicProfile;
  groups: PublicGroup[];
};

function shouldUseLoopbackBaseUrl(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

function getTenantLandingBaseUrl(host: string, protocol: string) {
  if (shouldUseLoopbackBaseUrl(host)) {
    const port = host.split(":")[1] ?? "3000";
    return `http://127.0.0.1:${port}`;
  }

  return `${protocol}://${host}`;
}

async function getTenantLandingPayload(host: string, protocol: string, tenantSlug: string) {
  const url = new URL("/api/public/tenant-landing", getTenantLandingBaseUrl(host, protocol));
  url.searchParams.set("slug", tenantSlug);

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`tenant-landing-fetch-failed:${response.status}`);
  }

  return (await response.json()) as TenantLandingPayload;
}

export default async function HomePage() {
  const headerStore = await headers();
  const host = normalizeHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000");
  const protocol = headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const tenantSlug = extractTenantSlug(host);

  if (!tenantSlug) {
    return <MarketingPage />;
  }

  const { tenant, teacher, groups } = await getTenantLandingPayload(host, protocol, tenantSlug);

  if (tenant.accountType === "PARENT") {
    redirect("/login?portal=parent");
  }

  return <TenantPublicPage groups={groups} teacher={teacher} tenant={tenant} />;
}
