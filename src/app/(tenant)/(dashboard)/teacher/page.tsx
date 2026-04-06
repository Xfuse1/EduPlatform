export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { TeacherDashboard } from "@/modules/dashboard/components/TeacherDashboard";
import { getTeacherDashboardData } from "@/modules/dashboard/queries";

export default async function TeacherDashboardPage() {
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const data = await getTeacherDashboardData(user.tenantId);

  return <TeacherDashboard data={data} />;
}
