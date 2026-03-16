export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { MockSectionPage } from "@/components/shared/MockSectionPage";
import { requireAuth } from "@/lib/auth";

export default async function TeacherSettingsPage() {
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  return (
    <MockSectionPage
      description="إعدادات سريعة لاسم السنتر والهوية البصرية وقنوات التنبيه المستخدمة."
      items={[
        {
          title: "اسم السنتر",
          subtitle: "أ/ أحمد حسن",
          meta: "نشط",
        },
        {
          title: "اللون الرئيسي",
          subtitle: "#1A5276",
          meta: "مرتبط بالهوية الحالية",
        },
        {
          title: "الإشعارات",
          subtitle: "واتساب + رسائل نصية",
          meta: "مفعلة",
        },
      ]}
      title="الإعدادات"
    />
  );
}
