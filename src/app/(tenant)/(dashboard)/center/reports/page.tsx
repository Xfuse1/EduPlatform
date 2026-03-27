export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { NotificationCenter } from "@/components/data-display/NotificationCenter";
import { StatsCard } from "@/components/data-display/StatsCard";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { TeacherDashboardCharts } from "@/modules/dashboard/components/TeacherDashboardCharts";
import { getCenterDashboardData } from "@/modules/dashboard/queries";
import { formatCurrency, toArabicDigits } from "@/lib/utils";

export default async function CenterReportsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const data = await getCenterDashboardData(tenant.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="الإيراد الحالي" tone="petrol" value={formatCurrency(data.summary.revenueCollected)} />
        <StatsCard title="إجمالي الحضور" tone="teal" value={`${toArabicDigits(data.summary.attendanceRate)}%`} />
        <StatsCard title="عدد المدرسين" tone="ink" value={toArabicDigits(data.summary.activeTeachers)} />
      </div>

      <TeacherDashboardCharts attendanceData={data.attendanceSeries} revenueData={data.revenueSeries} />

      <NotificationCenter items={data.notifications} title="سجل الإشعارات والتسليم" />
    </div>
  );
}
