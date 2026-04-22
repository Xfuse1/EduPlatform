export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { getTenantBySlug } from "@/lib/tenant";
import TenantPublicPage from "@/modules/public-pages/components/TenantPublicPage";
import { getPublicGroups, getPublicTenantProfile } from "@/modules/public-pages/queries";

export default async function TenantSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const normalizedSlug = slug.trim().toLowerCase();

  // Ignore asset-like requests such as /favicon.ico that can otherwise
  // accidentally match the tenant slug route during local development.
  if (!normalizedSlug || normalizedSlug.includes(".")) {
    notFound();
  }

  const tenant = await getTenantBySlug(normalizedSlug);

  if (!tenant || !tenant.isActive) {
    notFound();
  }

  const [teacher, groups] = await Promise.all([
    getPublicTenantProfile(tenant.id),
    getPublicGroups(tenant.id),
  ]);

  if (!teacher) {
    notFound();
  }

  return <TenantPublicPage groups={groups} teacher={teacher} tenant={tenant} />;
}
