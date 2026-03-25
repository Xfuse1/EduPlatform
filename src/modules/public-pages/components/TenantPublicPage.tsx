export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";

import { requireTenant } from "@/lib/tenant";
import { TeacherLanding } from "@/modules/public-pages/components/TeacherLanding";
import { getOpenGroups, getTeacherPublicProfile } from "@/modules/public-pages/queries";

export default async function TenantPublicPage() {
  const tenant = await requireTenant();

  if (tenant.accountType === "PARENT") {
    redirect("/login?portal=parent");
  }

  const [teacher, groups] = await Promise.all([getTeacherPublicProfile(tenant.id), getOpenGroups(tenant.id)]);

  if (!teacher) {
    notFound();
  }

  return <TeacherLanding groups={groups} teacher={teacher} />;
}
