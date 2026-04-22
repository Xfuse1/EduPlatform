export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenant";
import { TeacherLanding } from "@/modules/public-pages/components/TeacherLanding";
import { getPublicGroups, getPublicTenantProfile } from "@/modules/public-pages/queries";

export default async function TenantPublicPage() {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug") ?? "";
  const tenant = slug ? await getTenantBySlug(slug) : null;

  if (!tenant) {
    notFound();
  }

  const [teacher, groups, user] = await Promise.all([
    getPublicTenantProfile(tenant.id),
    getPublicGroups(tenant.id),
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
