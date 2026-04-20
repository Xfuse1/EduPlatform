import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getTenantBySlug } from "@/lib/tenant";
import MarketingPage from "@/modules/marketing/components/MarketingPage";
import TenantPublicPage from "@/modules/public-pages/components/TenantPublicPage";
import { getOpenGroups, getTeacherPublicProfile } from "@/modules/public-pages/queries";

export const dynamic = "force-dynamic";

const IGNORED_SUBDOMAINS = new Set(["www", "app", "api", "localhost", ""]);

function extractSubdomain(host: string): string {
  const hostname = host.split(":")[0] ?? "";

  if (hostname.endsWith(".vercel.app")) {
    return "";
  }

  if (hostname.endsWith(".localhost")) {
    return hostname.replace(".localhost", "");
  }

  const parts = hostname.split(".");
  return parts.length > 2 ? (parts[0] ?? "") : "";
}

export default async function HomePage() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const middlewareSlug = headerStore.get("x-tenant-slug") ?? "";
  const subdomain = middlewareSlug || extractSubdomain(host);

  if (IGNORED_SUBDOMAINS.has(subdomain)) {
    return <MarketingPage />;
  }

  const tenant = await getTenantBySlug(subdomain);

  if (!tenant) {
    notFound();
  }

  const [teacher, groups] = await Promise.all([
    getTeacherPublicProfile(tenant.id),
    getOpenGroups(tenant.id),
  ]);

  if (!teacher) {
    notFound();
  }

  return <TenantPublicPage groups={groups} teacher={teacher} tenant={tenant} />;
}
