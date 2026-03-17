import { Clock3, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatArabicDate, formatCurrency, toArabicDigits } from "@/lib/utils";

type StudentDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getStudentDashboardData>>;
};

const groupColors = ["#1A5276", "#2E86C1", "#27AE60"];

export function StudentDashboard({ data }: StudentDashboardProps) {
  const nextSessionDate = data.nextSession
    ? data.nextSession.date.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,_#163b54,_#1A5276_45%,_#2E86C1)] text-white">
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-white/75">الحصة القادمة</p>
          {data.nextSession ? (
            <div className="mt-4 space-y-3">
              <p className="text-2xl font-extrabold">{data.nextSession.group.name}</p>
              <p className="text-sm text-white/85">{nextSessionDate || formatArabicDate(data.nextSession.date)}</p>
              <p className="flex items-center gap-2 text-sm text-white/85">
                <Clock3 className="h-4 w-4" />
                <span dir="ltr">
                  {data.nextSession.timeStart} - {data.nextSession.timeEnd}
                </span>
              </p>
              <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold">متبقي يومان على الحصة</div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/80">لا توجد حصة قادمة مسجلة الآن</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>نسبة الحضور هذا الشهر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
              <span>الالتزام</span>
              <span>{toArabicDigits(data.attendance.rate)}%</span>
            </div>
            <Progress className="h-3" value={data.attendance.rate} />
            <p className="text-sm text-slate-500 dark:text-slate-400">معدل الحضور ممتاز هذا الشهر واستمرارك بنفس المستوى مهم.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>حالة المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            {data.payment.status === "PAID" ? (
              <div className="flex items-center gap-3 rounded-[18px] bg-emerald-50 p-4 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold">تم السداد بالكامل</p>
                  <p className="text-sm">لا توجد مبالغ مستحقة حالياً</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[18px] bg-rose-50 p-4 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                <Wallet className="h-8 w-8" />
                <div>
                  <p className="font-bold">{formatCurrency(data.payment.amount)}</p>
                  <p className="text-sm">مبلغ مستحق يحتاج إلى متابعة</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مجموعاتي</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {data.profile?.enrollments.length ? (
            data.profile.enrollments.map((enrollment, index) => (
              <div key={enrollment.group.id} className="rounded-[18px] border bg-white p-4 dark:bg-slate-900">
                <div className="mb-4 h-1.5 rounded-full" style={{ backgroundColor: groupColors[index % groupColors.length] }} />
                <p className="text-lg font-bold text-slate-900 dark:text-white">{enrollment.group.name}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{enrollment.group.days.join(" • ")}</p>
                <p className="mt-2 text-sm font-semibold text-primary dark:text-sky-300">
                  <span dir="ltr">
                    {enrollment.group.timeStart} - {enrollment.group.timeEnd}
                  </span>
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">لا توجد مجموعات مسجلة</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
