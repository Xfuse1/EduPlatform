export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { AssignmentsPageClient } from "@/modules/assignments/components/AssignmentsPageClient";
import { getAssignmentsByGroup, getTeacherGroups } from "@/modules/assignments/queries";

export default async function TeacherAssignmentsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  // Restrict to teacher staff, consistent with the rest of the teacher slice.
  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const [assignments, groups] = await Promise.all([
    getAssignmentsByGroup(tenant.id),
    getTeacherGroups(tenant.id),
  ]);

  return <AssignmentsPageClient initialAssignments={assignments as any[]} groups={groups} />;
}
