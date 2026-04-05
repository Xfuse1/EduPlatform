export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { StudentExamsPageClient } from "@/modules/exams/components/StudentExamsPageClient";
import { getExamsByStudent } from "@/modules/exams/queries";

export default async function StudentExamsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  // Basic check for student role
  if (user.role !== "STUDENT") {
    redirect(user.role === "TEACHER" ? "/teacher" : "/parent");
  }

  const exams = await getExamsByStudent(tenant.id, user.id);
  return <StudentExamsPageClient initialExams={exams} />;
}
