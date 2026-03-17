import { CalendarClock, CheckCircle2, CreditCard, UserRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, toArabicDigits } from "@/lib/utils";

type ParentDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getParentDashboardData>>;
};

function todayStatusLabel(status: string) {
  if (status === "PRESENT") return "حضر اليوم";
  if (status === "ABSENT") return "غاب اليوم";
  return "لا توجد حصة اليوم";
}

export function ParentDashboard({ data }: ParentDashboardProps) {
  const formatSessionDate = (date: Date) =>
    date.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[linear-gradient(135deg,_#1A5276,_#2E86C1)] text-white">
          <CardContent className="p-6">
            <p className="text-sm text-white/75">إجمالي الأبناء</p>
            <p className="mt-3 text-3xl font-extrabold">{toArabicDigits(data.children.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">معدل الحضور</p>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
              {data.children.length ? `${toArabicDigits(data.children[0].attendanceRate)}%` : "٠٪"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">حالة المصروفات</p>
            <p className="mt-3 text-lg font-extrabold text-emerald-600 dark:text-emerald-300">
              {data.children[0]?.payment.status === "PAID" ? "منتظمة" : "تحتاج متابعة"}
            </p>
          </CardContent>
        </Card>
      </section>

      {data.children.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500 dark:text-slate-300">لا توجد بيانات أبناء مرتبطة بهذا الحساب</CardContent>
        </Card>
      ) : (
        data.children.map((child) => (
          <Card key={child.id} className="overflow-hidden">
            <div className="bg-[linear-gradient(135deg,_rgba(26,82,118,0.12),_rgba(46,134,193,0.18))] px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-primary dark:text-sky-300">{child.name}</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{child.grade}</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm dark:bg-slate-900 dark:text-sky-300">
                  <UserRound className="h-6 w-6" />
                </div>
              </div>
            </div>

            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3 rounded-[16px] bg-slate-50 p-4 dark:bg-slate-900">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">حالة اليوم</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{todayStatusLabel(child.todayStatus)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-[16px] bg-slate-50 p-4 dark:bg-slate-900">
                  <CreditCard className="mt-1 h-5 w-5 text-primary dark:text-sky-300" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">المصروفات</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {child.payment.status === "PAID" ? "تم السداد بالكامل" : `${formatCurrency(child.payment.amount)} متبقي`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] bg-slate-50 p-4 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-bold text-slate-900 dark:text-white">نسبة الحضور</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{toArabicDigits(child.attendanceRate)}%</p>
                </div>
                <Progress className="h-3" value={child.attendanceRate} />
              </div>

              <div className="flex items-start gap-3 rounded-[16px] bg-slate-50 p-4 dark:bg-slate-900">
                <CalendarClock className="mt-1 h-5 w-5 text-primary dark:text-sky-300" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">الحصة القادمة</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {child.nextSession ? `${child.nextSession.group.name} - ${child.nextSession.timeStart}` : "لا توجد حصة قادمة"}
                  </p>
                  {child.nextSession ? (
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{formatSessionDate(child.nextSession.date)}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

