export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { StudentSchedule } from "@/modules/dashboard/components/StudentSchedule";

export default async function StudentSchedulePage() {
  const user = await requireAuth();

  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const sessions = [
    {
      id: "1",
      subject: "رياضيات ثالثة ثانوي",
      day: "الأحد",
      timeStart: "06:00 PM",
      timeEnd: "08:00 PM",
      room: "قاعة 2",
      color: "#1A5276",
      isToday: true,
    },
    {
      id: "2",
      subject: "مراجعة القدرات",
      day: "الجمعة",
      timeStart: "02:00 PM",
      timeEnd: "04:00 PM",
      room: "القاعة الرئيسية",
      color: "#8E44AD",
      isToday: false,
    },
  ] as const;

  return <StudentSchedule sessions={[...sessions]} />;
}
