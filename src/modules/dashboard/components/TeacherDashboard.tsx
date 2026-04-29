import { AlertTriangle, ArrowUpLeft, CalendarClock, CheckCircle2, DollarSign, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatTimeRange12Hour, getSessionStatusLabel, toArabicDigits } from "@/lib/utils";
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

const statIcons = [DollarSign, Users, CheckCircle2, AlertTriangle] as const;

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
      title: "إجمالي الطلاب",
      value: toArabicDigits(data.students.total),
      hint: `${toArabicDigits(data.students.recent)} طالب جديد هذا الشهر`,
    },
    {
      title: "نسبة الحضور",
      value: `${toArabicDigits(data.attendance.rate)}%`,
      hint: `تحسن بمقدار ${toArabicDigits(Math.abs(data.attendance.change))}%`,
    },
    {
      title: "المتأخرات",
      value: formatCurrency(data.outstanding.total),
      hint: `${toArabicDigits(data.outstanding.count)} طالب بحاجة للمتابعة`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,_#2471A3,_#2E86C1_45%,_#5DADE2)] px-6 py-7 text-white shadow-[0_20px_60px_rgba(46,134,193,0.25)] dark:bg-[linear-gradient(135deg,_#163b54,_#1A5276_45%,_#2E86C1)] dark:shadow-[0_20px_60px_rgba(26,82,118,0.25)]">
        <p className="text-start text-sm font-semibold text-white/75">لوحة المعلم</p>
        <h1 className="mt-3 text-start text-3xl font-extrabold">مرحبًا، {displayTeacherName}</h1>
        <p className="mt-3 max-w-2xl text-start text-sm leading-7 text-white/85">
          كل مؤشرات اليوم بين يديك: الحضور، التحصيل، الحصص.
        </p>
      </section>

      {!data.kashierApiConfigured ? (
        <section className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-start text-base font-extrabold">التحويل التلقائي غير مفعل</h2>
                <p className="mt-1 text-start text-sm leading-7 text-amber-800 dark:text-amber-100/85">
                  لم يتم إضافة متغيرات Kashier الخاصة بك بعد. أي فلوس يتم دفعها أونلاين لن تتحول تلقائيًا، وستحتاج للتواصل مع الإدارة لسحب الفلوس.
                </p>
              </div>
            </div>
            <Link
              href="/teacher/settings"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300"
            >
              إضافة بيانات Kashier
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <p className="text-start text-sm font-semibold text-slate-500 dark:text-slate-400">رصيد محفظة المعلم</p>
            <p className="mt-3 text-start text-3xl font-extrabold text-slate-950 dark:text-white">{formatCurrency(data.wallet.balance)}</p>
            <p className="mt-2 text-start text-xs leading-6 text-slate-500 dark:text-slate-400">
              الرصيد الداخلي المتاح للسحب. السحب يتم فقط من صفحة المحفظة عند طلبه صراحة.
            </p>
            <Link
              href="/payments/wallet"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              فتح المحفظة والسحب
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-start text-sm font-semibold text-slate-500 dark:text-slate-400">سحوبات ناجحة</p>
            <p className="mt-3 text-start text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">{formatCurrency(data.wallet.transfers.SUCCESS.amount)}</p>
            <p className="mt-2 text-start text-xs text-slate-500 dark:text-slate-400">{toArabicDigits(data.wallet.transfers.SUCCESS.count)} عملية</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-start text-sm font-semibold text-slate-500 dark:text-slate-400">سحوبات معلقة</p>
            <p className="mt-3 text-start text-2xl font-extrabold text-amber-600 dark:text-amber-300">{formatCurrency(data.wallet.transfers.PENDING.amount + data.wallet.transfers.RETRY.amount)}</p>
            <p className="mt-2 text-start text-xs text-slate-500 dark:text-slate-400">
              {toArabicDigits(data.wallet.transfers.PENDING.count + data.wallet.transfers.RETRY.count)} عملية
            </p>
          </CardContent>
        </Card>
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

      <section>
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
                        <span dir="ltr">{formatTimeRange12Hour(session.timeStart, session.timeEnd)}</span>
                      </p>
                    </div>
                    <SessionBadge status={session.status} />
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
