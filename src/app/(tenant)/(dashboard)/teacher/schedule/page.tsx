export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { MockSectionPage } from "@/components/shared/MockSectionPage";
import { requireAuth } from "@/lib/auth";

export default async function TeacherSchedulePage() {
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  return (
    <MockSectionPage
      description="جدول أسبوعي منظم لعرض الحصص والقاعات ومواعيد العمل خلال الأسبوع."
      items={[
        {
          title: "الأحد",
          subtitle: "ثالثة ثانوي - 06:00 PM",
          meta: "قاعة ٢",
        },
        {
          title: "الأربعاء",
          subtitle: "ثانية ثانوي - 04:00 PM",
          meta: "قاعة ١",
        },
        {
          title: "الجمعة",
          subtitle: "مراجعة القدرات - 02:00 PM",
          meta: "القاعة الرئيسية",
        },
      ]}
      title="الجدول"
    />
  );
}
