export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";
import { GroupsPageClient } from "@/modules/groups/components/GroupsPageClient";
import { getGroupsList } from "@/modules/groups/queries";

export default async function TeacherGroupsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const teacherScopeUserId = getTeacherScopeUserId(tenant, user);
  const groups = await getGroupsList(tenant.id, teacherScopeUserId ?? undefined);

  return <GroupsPageClient initialGroups={groups} />;
}
