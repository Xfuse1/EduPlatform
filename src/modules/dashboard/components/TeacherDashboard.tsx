import { AlertTriangle, ArrowUpLeft, CalendarClock, CheckCircle2, DollarSign, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatTimeRange12Hour, getSessionStatusLabel, toArabicDigits } from "@/lib/utils";
import { TeacherDashboardCharts } from "@/modules/dashboard/components/TeacherDashboardCharts";
import CSVImporter from "@/modules/students/components/CSVImporter";

type TeacherDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getTeacherDashboardData>>;
  teacherName?: string;
};

const statCardStyles = [
  "hover:shadow-[0_0_20px_rgba(0,184,160,0.08)]",
  "hover:shadow-[0_0_20px_rgba(0,184,160,0.08)]",
  "hover:shadow-[0_0_20px_rgba(0,184,160,0.08)]",
  "hover:shadow-[0_0_20px_rgba(0,184,160,0.08)]",
] as const;

const iconColors = [
  "text-[#F5A623]",
  "text-[#00B8A0]",
  "text-[#00B8A0]",
  "text-[#E8604C]",
] as const;

const statIcons = [DollarSign, Users, CheckCircle2, AlertTriangle] as const;

function SessionBadge({ status }: { status: string }) {
  const label = getSessionStatusLabel(status);
  const styles =
    status === "IN_PROGRESS"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : "border-sky-500/30 bg-sky-500/10 text-sky-400";

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
      <section className="relative overflow-hidden rounded-[16px] border border-secondary/25 bg-[linear-gradient(135deg,#081426_0%,#102A43_46%,#0B4D46_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(2,8,23,0.30)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,184,160,0.18),transparent_42%,rgba(245,166,35,0.10))]" />
        <div className="relative">
          <p className="text-start text-sm font-bold text-cyan-100/90">لوحة المعلم</p>
          <h1 className="mt-3 text-start text-3xl font-extrabold text-white drop-shadow-sm">مرحبًا، {displayTeacherName}</h1>
          <p className="mt-3 max-w-2xl text-start text-sm font-semibold leading-7 text-slate-100">
            كل مؤشرات اليوم بين يديك: الحضور، التحصيل، الحصص.
          </p>
        </div>
      </section>

      {data.students.total === 0 && (
        <section className="rounded-[22px] border border-[rgba(0,184,160,0.2)] bg-[rgba(0,184,160,0.05)] backdrop-blur-[16px] p-8 md:p-12 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                ابدأ بإضافة طلابك في ثوانٍ
              </h2>
              <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl">
                لا داعي لإضافة الطلاب يدوياً. استورد بياناتك من أي ملف Excel وسنتولى نحن مطابقة الأعمدة وتنظيم البيانات لك بشكل ذكي ومؤتمت.
              </p>
              
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-[#00B8A0]">١٠٠٪</div>
                  <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">دقة في استيراد البيانات</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-[#00B8A0]">١٠٠٠+</div>
                  <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">طالب في ضغطة واحدة</div>
                </div>
              </div>
            </div>
            
            <div className="w-full lg:w-[480px] shrink-0">
               <CSVImporter groups={data.groups} tenantId={data.tenantId} hideHeader />
            </div>
          </div>
        </section>
      )}

      {!data.kashierApiConfigured ? (
        <section className="rounded-[22px] border border-amber-200 bg-amber-50/50 backdrop-blur-[16px] px-5 py-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.05)] shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-start text-base font-extrabold text-amber-900 dark:text-amber-50">التحويل التلقائي غير مفعل</h2>
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
        <Card className="md:col-span-2 border border-slate-200 bg-white/50 backdrop-blur-[16px] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.05)] shadow-sm">
          <CardContent className="p-5">
            <p className="text-start text-sm font-semibold text-slate-600 dark:text-slate-400">رصيد محفظة المعلم</p>
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
        <Card className="border border-slate-200 bg-white/50 backdrop-blur-[16px] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.05)] shadow-sm">
          <CardContent className="p-5">
            <p className="text-start text-sm font-semibold text-slate-600 dark:text-slate-400">سحوبات ناجحة</p>
            <p className="mt-3 text-start text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">{formatCurrency(data.wallet.transfers.SUCCESS.amount)}</p>
            <p className="mt-2 text-start text-xs text-slate-500 dark:text-slate-400">{toArabicDigits(data.wallet.transfers.SUCCESS.count)} عملية</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white/50 backdrop-blur-[16px] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.05)] shadow-sm">
          <CardContent className="p-5">
            <p className="text-start text-sm font-semibold text-slate-600 dark:text-slate-400">سحوبات معلقة</p>
            <p className="mt-3 text-start text-2xl font-extrabold text-amber-600 dark:text-amber-300">{formatCurrency(data.wallet.transfers.PENDING.amount + data.wallet.transfers.RETRY.amount)}</p>
            <p className="mt-2 text-start text-xs text-slate-600 dark:text-slate-400">
              {toArabicDigits(data.wallet.transfers.PENDING.count + data.wallet.transfers.RETRY.count)} عملية
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = statIcons[index];

          return (
            <Card key={stat.title} className={`overflow-hidden border border-slate-200 bg-white dark:border-[rgba(255,255,255,0.07)] dark:bg-[rgba(255,255,255,0.03)] backdrop-blur-[12px] rounded-[16px] text-slate-900 dark:text-white transition-all duration-200 hover:-translate-y-[2px] hover:border-[rgba(0,184,160,0.3)] ${statCardStyles[index]}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-start text-sm font-semibold text-slate-600 dark:text-slate-400">{stat.title}</p>
                    <div className={`mt-3 text-start text-3xl font-extrabold ${iconColors[index]}`}>{stat.value}</div>
                    <div className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs font-bold text-slate-700 dark:text-white/80">
                      <ArrowUpLeft className={`h-4 w-4 ${iconColors[index]}`} />
                      {stat.hint}
                    </div>
                  </div>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10 ${iconColors[index]}`}>
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
        <Card className="border border-slate-200 bg-white/50 backdrop-blur-[16px] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.05)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-start text-slate-900 dark:text-white">حصص اليوم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.todaySessions.length === 0 ? (
              <div className="rounded-[16px] bg-slate-50 p-6 text-start text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                لا توجد حصص اليوم
              </div>
            ) : (
              data.todaySessions.map((session: any) => (
                  <div
                    key={session.id}
                    className={`rounded-[18px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-4 ${
                      session.status === "IN_PROGRESS" ? "border-s-4 border-s-[#00B8A0] dark:border-s-[#00B8A0]" : "border-s-4 border-s-[#1A2B6D] dark:border-s-[#1A2B6D]"
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
