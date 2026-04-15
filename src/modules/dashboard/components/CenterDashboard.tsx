import { BellRing, Building2, CheckSquare, DollarSign, LineChart, Users } from "lucide-react";

import { AlertRail } from "@/components/data-display/AlertRail";
import { NotificationCenter } from "@/components/data-display/NotificationCenter";
import { ScheduleTimeline } from "@/components/data-display/ScheduleTimeline";
import { StatsCard } from "@/components/data-display/StatsCard";
import { TeacherDashboardCharts } from "@/modules/dashboard/components/TeacherDashboardCharts";
import { formatCurrency, formatTimeRange12Hour, toArabicDigits } from "@/lib/utils";

export function CenterDashboard({
  centerName,
  data,
}: {
  centerName: string;
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getCenterDashboardData>>;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,_#132238,_#1A5276_45%,_#2E86C1)] px-6 py-7 text-white shadow-soft">
        <p className="text-start text-sm font-semibold text-white/75">مركز قيادة السنتر</p>
        <h1 className="mt-3 text-start text-3xl font-extrabold">{centerName}</h1>
        <p className="mt-3 max-w-2xl text-start text-sm leading-7 text-white/85">
          راقب التشغيل اليومي من شاشة واحدة: المدرسون، الحضور، التحصيل، والتنبيهات المباشرة.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatsCard hint="محصل هذا الشهر" icon={DollarSign} title="الإيراد الحالي" tone="petrol" value={formatCurrency(data.summary.revenueCollected)} />
        <StatsCard hint="قيمة تحتاج متابعة" icon={LineChart} title="المبالغ المعلقة" tone="amber" value={formatCurrency(data.summary.outstandingAmount)} />
        <StatsCard hint="كل الجلسات الفعالة" icon={CheckSquare} title="نسبة الحضور" tone="teal" value={`${toArabicDigits(data.summary.attendanceRate)}%`} />
        <StatsCard hint="نشطون الآن" icon={Users} title="المدرسون" tone="ink" value={toArabicDigits(data.summary.activeTeachers)} />
        <StatsCard hint="إجمالي القاعدة الحالية" icon={Building2} title="الطلاب" tone="rose" value={toArabicDigits(data.summary.activeStudents)} />
        <StatsCard hint="تحتاج إشرافًا مباشرًا" icon={BellRing} title="الحصص المباشرة" tone="petrol" value={toArabicDigits(data.summary.liveSessions)} />
      </section>

      <TeacherDashboardCharts attendanceData={data.attendanceSeries} revenueData={data.revenueSeries} />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ScheduleTimeline
          items={data.schedule.map((item) => ({
            id: item.id,
            title: item.subject,
            dayLabel: item.day,
            timeLabel: formatTimeRange12Hour(item.timeStart, item.timeEnd),
            location: item.room,
            statusLabel: item.isToday ? "اليوم" : undefined,
            accentColor: item.color,
          }))}
          title="خريطة الجدول والقاعات"
        />

        <AlertRail
          items={data.alerts.map((alert) => ({
            id: alert.id,
            title: alert.message,
            description: `يوجد مبلغ ${formatCurrency(alert.amount)} لم يُغلق بعد.`,
            severity: alert.severity,
            actionHref: "/center/payments",
            actionLabel: "مراجعة التحصيل",
          }))}
          title="تنبيهات سريعة"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <NotificationCenter items={data.notifications} title="إشعارات التشغيل" />
        <ScheduleTimeline
          items={data.liveAttendance.map((item) => ({
            id: item.id,
            title: item.sessionName,
            subtitle: `الحضور ${toArabicDigits(item.attendedCount)} من ${toArabicDigits(item.totalCount)}`,
            timeLabel: item.timeLabel,
            location: item.groupName,
            statusLabel: item.status === "IN_PROGRESS" ? "مباشر" : "متابعة",
            accentColor: item.status === "IN_PROGRESS" ? "#0F766E" : "#2E86C1",
          }))}
          title="بث الحضور الحي"
        />
      </section>
    </div>
  );
}
