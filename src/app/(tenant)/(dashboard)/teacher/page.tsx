export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";
import { TeacherDashboard } from "@/modules/dashboard/components/TeacherDashboard";
import { getTeacherDashboardData } from "@/modules/dashboard/queries";

export default async function TeacherDashboardPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const teacherScopeUserId = getTeacherScopeUserId(tenant, user);
  const data = await getTeacherDashboardData(tenant.id, teacherScopeUserId ?? undefined);
  const dashboardAccountType: "CENTER" | "TEACHER" =
    teacherScopeUserId || tenant.accountType !== "CENTER" ? "TEACHER" : "CENTER";

  return <TeacherDashboard accountType={dashboardAccountType} data={data} teacherName={user.name} />;
}
