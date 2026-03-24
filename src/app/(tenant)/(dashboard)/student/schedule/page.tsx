export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { StudentSchedule } from "@/modules/dashboard/components/StudentSchedule";
import { getStudentScheduleItems } from "@/modules/groups/queries";

export default async function StudentSchedulePage() {
  const user = await requireAuth();

  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const sessions = await getStudentScheduleItems(user.tenantId, user.id);

  return <StudentSchedule sessions={sessions} />;
}
