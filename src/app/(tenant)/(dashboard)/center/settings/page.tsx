export const dynamic = "force-dynamic";

import { Settings, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { StatsCard } from "@/components/data-display/StatsCard";
import TenantSettingsForm from "@/modules/settings/components/TenantSettingsForm";
import { PinSettingsCard } from "@/modules/settings/components/PinSettingsCard";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function CenterSettingsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const [studentEnrollments, teachersCount, userData] = await Promise.all([
    db.groupStudent.findMany({
      where: {
        status: {
          in: ["ACTIVE", "WAITLIST", "PENDING"],
        },
        group: {
          tenantId: tenant.id,
        },
        student: {
          role: "STUDENT",
          isActive: true,
        },
      },
      distinct: ["studentId"],
      select: { studentId: true },
    }),
    db.user.count({
      where: {
        tenantId: tenant.id,
        role: "TEACHER",
        isActive: true,
      },
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { phone: true, pinHash: true },
    }),
  ]);
  const studentsCount = studentEnrollments.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard icon={Settings} title="اسم الكيان" tone="petrol" value={tenant.name} />
        <StatsCard icon={Users} title="نشاط السنتر" tone="ink" value={`${studentsCount} طالب / ${teachersCount} مدرس`} />
      </div>

      <PinSettingsCard phone={userData?.phone ?? null} hasPin={!!userData?.pinHash} />

      <TenantSettingsForm
        tenant={{
          slug: tenant.slug,
          name: tenant.name,
          logoUrl: tenant.logoUrl,
          bio: tenant.bio,
          subjects: tenant.subjects,
          region: tenant.region,
        }}
      />
    </div>
  );
}
