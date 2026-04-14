export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { TeacherLanding } from "@/modules/public-pages/components/TeacherLanding";
import { getOpenGroups, getTeacherPublicProfile } from "@/modules/public-pages/queries";

export default async function TenantPublicPage() {
  const tenant = await requireTenant();
  const [teacher, groups, user] = await Promise.all([
    getTeacherPublicProfile(tenant.id),
    getOpenGroups(tenant.id),
    getCurrentUser(),
  ]);

  if (!teacher) {
    notFound();
  }

  const isStudent = user?.role === "STUDENT";

  return (
    <TeacherLanding
      groups={groups}
      teacher={teacher}
      isStudent={isStudent}
      currentUserId={user?.id}
    />
  );
}
