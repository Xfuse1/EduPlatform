export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getStudentProfile } from "@/modules/students/queries";
import { StudentSchedule } from "@/modules/dashboard/components/StudentSchedule";

export default async function StudentSchedulePage() {
  const user = await requireAuth();
  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const tenant = await requireTenant();
  const profile = await getStudentProfile(tenant.id, user.id);

  const dayMap: Record<string, string> = { sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت" };
  const sessions = (profile?.enrollments ?? []).flatMap((enrollment) =>
    enrollment.group.days.map((day: string) => ({
      id: `${enrollment.group.id}-${day}`,
      subject: enrollment.group.name,
      day: dayMap[day.toLowerCase()] ?? day,
      timeStart: enrollment.group.timeStart,
      timeEnd: enrollment.group.timeEnd ?? enrollment.group.timeStart,
      color: (profile?.enrolledGroups?.find((g) => g.id === enrollment.group.id)?.color ?? "#1A5276"),
      isToday: false,
    }))
  );

  return <StudentSchedule sessions={sessions} />;
}



