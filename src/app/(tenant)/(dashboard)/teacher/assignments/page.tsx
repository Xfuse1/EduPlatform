export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { AssignmentsPageClient } from "@/modules/assignments/components/AssignmentsPageClient";
import { getAssignments, getTeacherGroups } from "@/modules/assignments/queries";

export default async function TeacherAssignmentsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  // Basic check for teacher/management roles
  if (!["TEACHER", "ASSISTANT", "MANAGER", "ADMIN"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const [assignments, groups] = await Promise.all([
    getAssignments(tenant.id),
    getTeacherGroups(tenant.id),
  ]);

  return <AssignmentsPageClient initialAssignments={assignments as any[]} groups={groups} />;
}
