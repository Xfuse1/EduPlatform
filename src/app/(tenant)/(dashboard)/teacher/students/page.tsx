export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { canAddStudent } from "@/lib/subscription-helpers";
import { getPublicGroups } from "@/modules/public-pages/queries";
import { StudentsPageClient } from "@/modules/students/components/StudentsPageClient";
import { getStudentsList } from "@/modules/students/queries";

export default async function TeacherStudentsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const [students, groups, subscriptionCheck] = await Promise.all([
    getStudentsList(tenant.id),
    getPublicGroups(tenant.id),
    canAddStudent(tenant.id),
  ]);

  return <StudentsPageClient groups={groups} students={students} canAddStudents={subscriptionCheck.allowed} />;
}
