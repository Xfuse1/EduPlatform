export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { GroupsPageClient } from "@/modules/groups/components/GroupsPageClient";
import { getPublicGroups } from "@/modules/public-pages/queries";

export default async function TeacherGroupsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const groups = await getPublicGroups(tenant.id);

  return <GroupsPageClient initialGroups={groups} />;
}
