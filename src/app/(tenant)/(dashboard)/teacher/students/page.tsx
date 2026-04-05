export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getOpenGroups } from "@/modules/public-pages/queries";
import { StudentsPageClient } from "@/modules/students/components/StudentsPageClient";
import { getStudentsList } from "@/modules/students/queries";

export default async function TeacherStudentsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const [students, groups] = await Promise.all([getStudentsList(tenant.id), getOpenGroups(tenant.id)]);

  return <StudentsPageClient groups={groups} students={students} />;
}
