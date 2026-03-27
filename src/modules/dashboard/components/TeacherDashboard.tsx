import { CalendarClock, CheckSquare, DollarSign, Users } from "lucide-react";

import { AlertRail } from "@/components/data-display/AlertRail";
import { ScheduleTimeline } from "@/components/data-display/ScheduleTimeline";
import { StatsCard } from "@/components/data-display/StatsCard";
import { formatCurrency, toArabicDigits } from "@/lib/utils";
import { TeacherDashboardCharts } from "@/modules/dashboard/components/TeacherDashboardCharts";

type TeacherDashboardProps = {
  accountType: "CENTER" | "TEACHER";
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getTeacherDashboardData>>;
  teacherName?: string;
};

export function TeacherDashboard({ accountType, data, teacherName }: TeacherDashboardProps) {
  const displayTeacherName = teacherName?.trim() || data.teacherName?.trim() || "المعلم";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,_#132238,_#1A5276_45%,_#2E86C1)] px-6 py-7 text-white shadow-soft">
        <p className="text-start text-sm font-semibold text-white/75">{accountType === "CENTER" ? "لوحة تشغيل السنتر" : "لوحة المدرس"}</p>
        <h1 className="mt-3 text-start text-3xl font-extrabold">أهلاً، {displayTeacherName}</h1>
        <p className="mt-3 max-w-2xl text-start text-sm leading-7 text-white/85">
          ابدأ من ماذا يحدث الآن، ثم انتقل مباشرة إلى الحضور أو التحصيل أو مراجعة اليوم.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard hint={`${data.revenue.change >= 0 ? "تحسن" : "انخفاض"} ${toArabicDigits(Math.abs(data.revenue.change))}%`} icon={DollarSign} title="إيرادات الشهر" tone="petrol" trend={data.revenue.change >= 0 ? "up" : "down"} value={formatCurrency(data.revenue.thisMonth)} />
        <StatsCard hint={`${toArabicDigits(data.outstanding.count)} حالة تحتاج متابعة`} icon={CheckSquare} title="المتأخرات" tone="amber" value={formatCurrency(data.outstanding.total)} />
        <StatsCard hint={`${toArabicDigits(data.students.recent)} طالب جديد`} icon={Users} title="إجمالي الطلاب" tone="teal" value={toArabicDigits(data.students.total)} />
        <StatsCard hint={`التحسن ${toArabicDigits(Math.abs(data.attendance.change))}%`} icon={CalendarClock} title="نسبة الحضور" tone="ink" value={`${toArabicDigits(data.attendance.rate)}%`} />
      </section>

      <TeacherDashboardCharts attendanceData={data.attendanceSeries} revenueData={data.revenueSeries} />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ScheduleTimeline
          items={data.todaySessions.map((session) => ({
            id: session.id,
            title: session.group.name,
            subtitle: session.status === "IN_PROGRESS" ? "الحصة جارية الآن" : "جاهزة للبدء",
            timeLabel: `${session.timeStart} - ${session.timeEnd}`,
            statusLabel: session.status === "IN_PROGRESS" ? "مباشر" : "اليوم",
            accentColor: session.status === "IN_PROGRESS" ? "#0F766E" : "#2E86C1",
          }))}
          title="أجندة اليوم"
        />

        <AlertRail
          items={data.alerts.map((alert) => ({
            id: alert.id,
            title: alert.message,
            description: `يوجد مبلغ ${formatCurrency(alert.amount)} يحتاج متابعة.`,
            severity: alert.severity,
            actionHref: `/payments?student=${encodeURIComponent(alert.studentName)}&status=OVERDUE`,
            actionLabel: "فتح التحصيل",
          }))}
          title="ما يحتاج تدخل"
        />
      </section>
    </div>
  );
}
