export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { requireTenant } from "@/lib/tenant";
import { TeacherLanding } from "@/modules/public-pages/components/TeacherLanding";
import { getOpenGroups, getTeacherPublicProfile } from "@/modules/public-pages/queries";

export default async function TenantPublicPage() {
  const tenant = await requireTenant();
  const [teacher, groups] = await Promise.all([
    getTeacherPublicProfile(tenant.id),
    getOpenGroups(tenant.id),
  ]);

  if (!teacher) {
    notFound();
  }

  return <TeacherLanding groups={groups} teacher={teacher} />;
}
