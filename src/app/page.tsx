export const dynamic = "force-dynamic";

import { headers } from "next/headers";

import { extractTenantSlug, normalizeHost } from "@/lib/tenant-host";
import MarketingPage from "@/modules/marketing/components/MarketingPage";
import TenantPublicPage from "@/modules/public-pages/components/TenantPublicPage";

export default async function HomePage() {
  const headerStore = await headers();
  const host = normalizeHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000");
  const tenantSlug = extractTenantSlug(host);

  if (!tenantSlug) {
    return <MarketingPage />;
  }

  return <TenantPublicPage />;
}
