export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { StudentExamsPageClient } from "@/modules/exams/components/StudentExamsPageClient";

export default async function StudentExamsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  // Basic check for student role
  if (user.role !== "STUDENT") {
    redirect(user.role === "TEACHER" ? "/teacher" : "/parent");
  }

  // Pass empty mock data until backend is ready
  return <StudentExamsPageClient initialExams={[]} />;
}
