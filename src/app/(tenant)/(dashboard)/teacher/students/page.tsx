export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";
import { StudentsPageClient } from "@/modules/students/components/StudentsPageClient";
import { getStudentsList } from "@/modules/students/queries";

export default async function TeacherStudentsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const teacherScopeUserId = getTeacherScopeUserId(tenant, user);
  const students = await getStudentsList(tenant.id, teacherScopeUserId ?? undefined);

  return <StudentsPageClient students={students} />;
}
