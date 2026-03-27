export const dynamic = "force-dynamic";

import { Palette, Settings, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { StatsCard } from "@/components/data-display/StatsCard";
import TenantSettingsForm from "@/modules/settings/components/TenantSettingsForm";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function CenterSettingsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const [studentsCount, teachersCount] = await Promise.all([
    db.user.count({
      where: {
        tenantId: tenant.id,
        role: "STUDENT",
        isActive: true,
      },
    }),
    db.user.count({
      where: {
        tenantId: tenant.id,
        role: "TEACHER",
        isActive: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard icon={Settings} title="اسم الكيان" tone="petrol" value={tenant.name} />
        <StatsCard icon={Palette} title="اللون الرئيسي" tone="teal" value={tenant.themeColor} />
        <StatsCard icon={Users} title="نشاط السنتر" tone="ink" value={`${studentsCount} طالب / ${teachersCount} مدرس`} />
      </div>

      <TenantSettingsForm
        tenant={{
          slug: tenant.slug,
          name: tenant.name,
          logoUrl: tenant.logoUrl,
          themeColor: tenant.themeColor,
          bio: tenant.bio,
          subjects: tenant.subjects,
          region: tenant.region,
        }}
      />
    </div>
  );
}
