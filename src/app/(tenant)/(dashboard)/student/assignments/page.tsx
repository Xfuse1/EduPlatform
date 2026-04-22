export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { StudentAssignments } from "@/modules/dashboard/components/StudentAssignments";
import { getAssignmentsByStudent } from "@/modules/assignments/queries";

export default async function StudentAssignmentsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const assignments = await getAssignmentsByStudent(user.id);

  return (
    <div className="space-y-6">
      <StudentAssignments initialAssignments={assignments as any[]} />
    </div>
  );
}
