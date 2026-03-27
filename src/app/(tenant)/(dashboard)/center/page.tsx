export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { CenterDashboard } from "@/modules/dashboard/components/CenterDashboard";
import { getCenterDashboardData } from "@/modules/dashboard/queries";

export default async function CenterDashboardPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const data = await getCenterDashboardData(tenant.id);

  return <CenterDashboard centerName={tenant.name} data={data} />;
}
