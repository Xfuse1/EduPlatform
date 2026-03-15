export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { StudentDashboard } from "@/modules/dashboard/components/StudentDashboard";
import { getStudentDashboardData } from "@/modules/dashboard/queries";

export default async function StudentDashboardPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const data = await getStudentDashboardData(tenant.id, user.id);

  return <StudentDashboard data={data} />;
}
