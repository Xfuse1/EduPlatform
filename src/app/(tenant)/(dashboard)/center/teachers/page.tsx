export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { TeachersPageClient } from "@/modules/teachers/components/TeachersPageClient";
import { getTeachersPageData } from "@/modules/teachers/queries";

export default async function CenterTeachersPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const data = await getTeachersPageData(tenant.id);

  return <TeachersPageClient currentUserId={user.id} initialTeachers={data.teachers} />;
}
