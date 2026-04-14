export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { StudentDashboard } from "@/modules/dashboard/components/StudentDashboard";
import { getStudentDashboardData } from "@/modules/dashboard/queries";
import { getOpenGroups } from "@/modules/public-pages/queries";

export default async function StudentDashboardPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const [data, availableGroups] = await Promise.all([
    getStudentDashboardData(tenant.id, user.id),
    getOpenGroups(tenant.id),
  ]);

  return <StudentDashboard data={data} availableGroups={availableGroups} />;
}
