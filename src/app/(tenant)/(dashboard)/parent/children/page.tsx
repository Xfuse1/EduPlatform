export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { ParentChildrenPage } from "@/modules/dashboard/components/ParentChildrenPage";
import { getParentDashboardData } from "@/modules/dashboard/queries";

export default async function ParentChildrenRoutePage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "PARENT") {
    redirect(user.role === "STUDENT" ? "/student" : "/teacher");
  }

  const data = await getParentDashboardData(user.tenantId, user.id);

  return <ParentChildrenPage data={data} />;
}
