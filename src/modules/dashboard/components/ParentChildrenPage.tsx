import { CalendarClock, CheckCircle2, CreditCard, GraduationCap, School } from "lucide-react";

import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, toArabicDigits } from "@/lib/utils";
import { LinkChildForm } from "@/modules/parent/components/LinkChildForm";
import { ChildGroupEnrollmentButton } from "@/modules/parent/components/ChildGroupEnrollmentButton";
import { RemoveChildButton } from "@/modules/parent/components/RemoveChildButton";

type ParentChildrenPageProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getParentDashboardData>>;
};

function paymentStatusLabel(status: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE") {
  if (status === "PAID") return "منتظم";
  if (status === "PARTIAL") return "سداد جزئي";
  if (status === "OVERDUE") return "متأخر";
  return "قيد المتابعة";
}

function todayStatusLabel(status: string) {
  if (status === "PRESENT") return "حضر اليوم";
  if (status === "ABSENT") return "غاب اليوم";
  return "لا توجد حصة اليوم";
}

export function ParentChildrenPage({ data }: ParentChildrenPageProps) {
  const formatSessionDate = (date: Date) =>
    date.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,_#163b54,_#1A5276_45%,_#2E86C1)] px-6 py-7 text-white shadow-[0_20px_60px_rgba(26,82,118,0.25)]">
        <p className="text-start text-sm font-semibold text-white/75">صفحة الأبناء</p>
        <h1 className="mt-3 text-start text-3xl font-extrabold">أبنائي</h1>
        <p className="mt-3 max-w-2xl text-start text-sm leading-7 text-white/85">
          استخدم زر إضافة ابن جديد لفتح الفورم وربط الأبناء بحسابك، ثم تابع الحضور والمصاريف والحصة القادمة لكل ابن.
        </p>
      </section>

      <LinkChildForm />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[linear-gradient(135deg,_#1A5276,_#2E86C1)] text-white">
          <CardContent className="p-6">
            <p className="text-sm text-white/75">إجمالي الأبناء</p>
            <p className="mt-3 text-3xl font-extrabold">{toArabicDigits(data.children.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">متوسط الحضور</p>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
              {data.children.length
                ? `${toArabicDigits(Math.round(data.children.reduce((sum, child) => sum + child.attendanceRate, 0) / data.children.length))}%`
                : "٠٪"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">الحسابات التي تحتاج متابعة</p>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
              {toArabicDigits(data.children.filter((child) => child.payment.status !== "PAID").length)}
            </p>
          </CardContent>
        </Card>
      </section>

      {data.children.length === 0 ? (
        <EmptyState
          title="لا يوجد أبناء مرتبطون بعد"
          message="استخدم زر إضافة ابن جديد بالأعلى، ثم اكتب رقم هاتف الابن كما هو مسجل في السنتر ليظهر هنا بعد الربط."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.children.map((child) => (
            <Card key={child.id} className="overflow-hidden border-slate-200/80 dark:border-slate-800/80">
              <div className="bg-[linear-gradient(135deg,_rgba(26,82,118,0.12),_rgba(46,134,193,0.18))] px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-primary dark:text-sky-300">{child.name}</h2>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <GraduationCap className="h-4 w-4" />
                      {child.grade}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <School className="h-4 w-4" />
                      {child.tenantName}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:min-w-[190px]">
                    <ChildGroupEnrollmentButton
                      availableGroups={child.availableGroups ?? []}
                      childId={child.id}
                      childName={child.name}
                      currentGroups={child.currentGroups ?? []}
                    />
                    <RemoveChildButton childId={child.id} childName={child.name} />
                  </div>
                </div>
              </div>

              <CardContent className="space-y-5 p-6">
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
                      <p className="font-bold text-slate-900 dark:text-white">المصاريف</p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{paymentStatusLabel(child.payment.status)}</p>
                      {child.payment.status !== "PAID" ? (
                        <p className="mt-1 text-sm font-semibold text-amber-600 dark:text-amber-300">{formatCurrency(child.payment.amount)} متبقي</p>
                      ) : null}
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
          ))}
        </div>
      )}
    </div>
  );
}
