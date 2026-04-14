import { AlertTriangle, ArrowUpLeft, CalendarClock, CheckCircle2, DollarSign, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getSessionStatusLabel, toArabicDigits } from "@/lib/utils";
import { TeacherDashboardCharts } from "@/modules/dashboard/components/TeacherDashboardCharts";

type TeacherDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getTeacherDashboardData>>;
  teacherName?: string;
};

const statCardStyles = [
  "from-[#2E86C1] to-[#5DADE2] dark:from-[#1A5276] dark:to-[#2E86C1]",
  "from-[#E67E22] to-[#E74C3C] dark:from-[#F39C12] dark:to-[#E74C3C]",
  "from-[#229954] to-[#52BE80] dark:from-[#1E8449] dark:to-[#27AE60]",
  "from-[#16A085] to-[#45B39D] dark:from-[#117A65] dark:to-[#48C9B0]",
] as const;

const statIcons = [DollarSign, AlertTriangle, Users, CheckCircle2] as const;

function SessionBadge({ status }: { status: string }) {
  const label = getSessionStatusLabel(status);
  const styles =
    status === "IN_PROGRESS"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
      : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300";

  return <span className={`rounded-full border px-3 py-2 text-xs font-bold ${styles}`}>{label}</span>;
}

export function TeacherDashboard({ data, teacherName }: TeacherDashboardProps) {
  const displayTeacherName = teacherName?.trim() || data.teacherName?.trim() || "المعلم";
  const stats = [
    {
      title: "إيرادات الشهر",
      value: formatCurrency(data.revenue.thisMonth),
      hint: `${data.revenue.change >= 0 ? "ارتفاع" : "انخفاض"} ${toArabicDigits(Math.abs(data.revenue.change))}%`,
    },
    {
      title: "المتأخرات",
      value: formatCurrency(data.outstanding.total),
      hint: `${toArabicDigits(data.outstanding.count)} طالب بحاجة للمتابعة`,
    },
    {
      title: "إجمالي الطلاب",
      value: toArabicDigits(data.students.total),
      hint: `${toArabicDigits(data.students.recent)} طالب جديد هذا الشهر`,
    },
    {
      title: "نسبة الحضور",
      value: `${toArabicDigits(data.attendance.rate)}%`,
      hint: `تحسن بمقدار ${toArabicDigits(Math.abs(data.attendance.change))}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,_#2471A3,_#2E86C1_45%,_#5DADE2)] px-6 py-7 text-white shadow-[0_20px_60px_rgba(46,134,193,0.25)] dark:bg-[linear-gradient(135deg,_#163b54,_#1A5276_45%,_#2E86C1)] dark:shadow-[0_20px_60px_rgba(26,82,118,0.25)]">
        <p className="text-start text-sm font-semibold text-white/75">لوحة المعلم</p>
        <h1 className="mt-3 text-start text-3xl font-extrabold">مرحبًا، {displayTeacherName}</h1>
        <p className="mt-3 max-w-2xl text-start text-sm leading-7 text-white/85">
          كل مؤشرات اليوم بين يديك: الحضور، التحصيل، الحصص، والتنبيهات المهمة.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = statIcons[index];

          return (
            <Card key={stat.title} className={`overflow-hidden border-0 bg-gradient-to-l ${statCardStyles[index]} text-white`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-start text-sm font-semibold text-white/80">{stat.title}</p>
                    <div className="mt-3 text-start text-3xl font-extrabold">{stat.value}</div>
                    <div className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                      <ArrowUpLeft className="h-4 w-4" />
                      {stat.hint}
                    </div>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                    <Icon className="h-7 w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <TeacherDashboardCharts revenueData={data.revenueSeries} attendanceData={data.attendanceSeries} />

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-start">حصص اليوم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.todaySessions.length === 0 ? (
              <div className="rounded-[16px] bg-slate-50 p-6 text-start text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                لا توجد حصص اليوم
              </div>
            ) : (
              data.todaySessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-[18px] border bg-white p-4 dark:bg-slate-900 ${
                    session.status === "IN_PROGRESS" ? "border-s-4 border-s-emerald-500" : "border-s-4 border-s-sky-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-start text-lg font-bold text-slate-900 dark:text-white">{session.group.name}</p>
                      <p className="flex items-center gap-2 text-start text-sm text-slate-500 dark:text-slate-400">
                        <CalendarClock className="h-4 w-4" />
                        <span dir="ltr">
                          {session.timeStart} - {session.timeEnd}
                        </span>
                      </p>
                    </div>
                    <SessionBadge status={session.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-start">التنبيهات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.alerts.length === 0 ? (
              <div className="rounded-[16px] bg-slate-50 p-6 text-start text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                لا توجد تنبيهات حالية
              </div>
            ) : (
              data.alerts.map((alert) => (
                <div key={alert.id} className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-start font-bold text-amber-900 dark:text-amber-200">{alert.message}</p>
                      <p className="mt-2 text-start text-sm text-amber-800 dark:text-amber-300">{formatCurrency(alert.amount)}</p>
                      <Link
                        className="touch-target mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto"
                        href={`/payments?student=${encodeURIComponent(alert.studentName)}&status=OVERDUE`}
                      >
                        متابعة التحصيل
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

