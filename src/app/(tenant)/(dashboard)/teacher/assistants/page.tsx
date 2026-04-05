export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getAssistants } from "@/modules/assistants/queries";
import { AssistantsPageClient } from "@/modules/assistants/components/AssistantsPageClient";

export default async function TeacherAssistantsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  // Basic check for teacher/management roles
  if (!["TEACHER", "MANAGER", "ADMIN"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const assistants = await getAssistants(tenant.id);

  return <AssistantsPageClient assistants={assistants as any[]} />;
}
