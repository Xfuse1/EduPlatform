export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { ExamsPageClient } from "@/modules/exams/components/ExamsPageClient";
import { getTeacherGroups } from "@/modules/assignments/queries";
import { getExamsByTenant } from "@/modules/exams/queries";

export default async function TeacherExamsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  // Basic check for teacher/management roles
  if (!["TEACHER", "ASSISTANT", "MANAGER", "ADMIN"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const [groups, exams] = await Promise.all([
    getTeacherGroups(tenant.id),
    getExamsByTenant(tenant.id),
  ]);

  return <ExamsPageClient initialExams={exams} groups={groups} />;
}
