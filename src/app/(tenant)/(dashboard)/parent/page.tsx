export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { ParentDashboard } from "@/modules/dashboard/components/ParentDashboard";
import { getParentDashboardData } from "@/modules/dashboard/queries";

export default async function ParentDashboardPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "PARENT") {
    redirect(user.role === "STUDENT" ? "/student" : "/teacher");
  }

  const data = await getParentDashboardData(tenant.id, user.id);

  return <ParentDashboard data={data} />;
}
