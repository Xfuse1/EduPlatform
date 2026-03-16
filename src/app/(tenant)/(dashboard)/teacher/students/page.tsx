export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { MOCK_STUDENTS } from "@/lib/mock-data";
import { StudentsPageClient } from "@/modules/students/components/StudentsPageClient";

export default async function TeacherStudentsPage() {
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  return <StudentsPageClient students={MOCK_STUDENTS} />;
}
