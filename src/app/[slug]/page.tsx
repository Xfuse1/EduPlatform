export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";

import { getTenantBySlug } from "@/lib/tenant";
import TenantPublicPage from "@/modules/public-pages/components/TenantPublicPage";
import { getOpenGroups, getTeacherPublicProfile } from "@/modules/public-pages/queries";

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

  if (tenant.accountType === "PARENT") {
    redirect("/login?portal=parent");
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