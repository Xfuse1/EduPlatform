export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { canManageTeacherAccounts } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";
import { TeachersPageClient } from "@/modules/teachers/components/TeachersPageClient";
import { getTeachersPageData } from "@/modules/teachers/queries";

export default async function TeacherTeachersPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  if (!canManageTeacherAccounts(tenant, user)) {
    redirect("/teacher");
  }

  const data = await getTeachersPageData(tenant.id);

  return <TeachersPageClient currentUserId={user.id} initialTeachers={data.teachers} />;
}
