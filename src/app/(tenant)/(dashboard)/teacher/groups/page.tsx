export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { MOCK_GROUPS } from "@/lib/mock-data";
import { GroupsPageClient } from "@/modules/groups/components/GroupsPageClient";

export default async function TeacherGroupsPage() {
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  return <GroupsPageClient initialGroups={MOCK_GROUPS} />;
}
