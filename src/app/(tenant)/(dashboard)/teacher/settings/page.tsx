export const dynamic = "force-dynamic";

import { Palette, Phone, Settings, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function TeacherSettingsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const [studentsCount, groupsCount] = await Promise.all([
    db.user.count({
      where: {
        tenantId: tenant.id,
        role: "STUDENT",
        isActive: true,
      },
    }),
    db.group.count({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
    }),
  ]);

  const items = [
    {
      title: "اسم السنتر",
      subtitle: tenant.name,
      icon: Settings,
    },
    {
      title: "اللون الرئيسي",
      subtitle: tenant.themeColor,
      icon: Palette,
    },
    {
      title: "رقم التواصل",
      subtitle: tenant.phone ?? "غير محدد",
      icon: Phone,
    },
    {
      title: "إجمالي الطلاب / المجموعات",
      subtitle: `${studentsCount} طالب - ${groupsCount} مجموعة`,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">الإعدادات</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">بيانات السنتر الحالية المستخرجة من قاعدة البيانات.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardContent className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-sky-400/10 dark:text-sky-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
