'use client';

import { useState, useTransition } from "react";
import { Clock3, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatArabicDate, formatCurrency, formatTimeRange12Hour, toArabicDigits } from "@/lib/utils";
import { enrollStudentInGroup } from "@/modules/student/actions";

type StudentDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getStudentDashboardData>>;
  availableGroups?: Array<{
    id: string;
    name: string;
    subject: string;
    gradeLevel: string;
    days: string[];
    timeStart: string;
    timeEnd: string;
    monthlyFee: number;
    remainingCapacity: number;
    isFull: boolean;
    color: string | null;
  }>;
  pendingGroupIds?: string[];
};

const groupColors = ["#1A5276", "#2E86C1", "#27AE60"];

import { StudentAssignments } from "./StudentAssignments";

export function StudentDashboard({ data, availableGroups, pendingGroupIds = [] }: StudentDashboardProps) {
  const pendingAssignments = (data.assignments as Array<{ status: string }>).filter(
    (assignment) => assignment.status === "pending" || assignment.status === "overdue",
  );
  const nextSessionDate = data.nextSession
    ? data.nextSession.date.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Assignments Section */}
      <StudentAssignments
        initialAssignments={pendingAssignments as any}
        title="الواجبات غير المسلمة"
        emptyMessage="لا توجد واجبات غير مسلمة حالياً"
      />

      <Card className="overflow-hidden border border-white/10 bg-gradient-to-br from-[#1A2B6D] to-[#00B8A0] rounded-[20px] text-white shadow-xl">
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm font-bold text-white/70">الحصة القادمة</p>
          {data.nextSession ? (
            <div className="mt-4 space-y-3">
              <p className="break-words text-xl font-black text-white sm:text-2xl">{data.nextSession.group.name}</p>
              <p className="text-sm font-medium text-white/90">{nextSessionDate || formatArabicDate(data.nextSession.date)}</p>
              <p className="flex items-center gap-2 text-sm font-medium text-white/90">
                <Clock3 className="h-4 w-4" />
                <span dir="ltr">
                  {formatTimeRange12Hour(data.nextSession.timeStart, data.nextSession.timeEnd)}
                </span>
              </p>
              <div className="inline-flex rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs font-bold text-white border border-white/20">متبقي يومان على الحصة</div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/80">لا توجد حصة قادمة مسجلة الآن</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/50 rounded-[20px] shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-500 dark:text-slate-400 text-sm font-bold">نسبة الحضور هذا الشهر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>الالتزام</span>
              <span className="text-[#00B8A0]">{toArabicDigits(data.attendance.rate)}%</span>
            </div>
            <Progress className="h-2.5 bg-slate-100 dark:bg-slate-800" value={data.attendance.rate} />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">معدل الحضور ممتاز هذا الشهر واستمرارك بنفس المستوى مهم.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/50 rounded-[20px] shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-500 dark:text-slate-400 text-sm font-bold">حالة المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            {data.payment.status === "PAID" ? (
              <div className="flex items-center gap-3 rounded-[18px] bg-emerald-50 dark:bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold">تم السداد بالكامل</p>
                  <p className="text-sm opacity-80">لا توجد مبالغ مستحقة حالياً</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[18px] bg-amber-50 dark:bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                <Wallet className="h-6 w-6" />
                <div>
                  <p className="font-bold">{formatCurrency(data.payment.amount)}</p>
                  <p className="text-sm opacity-80">مبلغ مستحق يحتاج إلى متابعة</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white/50 backdrop-blur-[16px] dark:border-border-soft dark:bg-surface shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">مجموعاتي</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {data.profile?.enrollments.length ? (
            data.profile.enrollments.map((enrollment, index) => (
              <div key={enrollment.group.id} className="rounded-[18px] border bg-white p-4 dark:bg-slate-900">
                <div className="mb-4 h-1.5 rounded-full" style={{ backgroundColor: groupColors[index % groupColors.length] }} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="break-words text-lg font-bold text-slate-900 dark:text-white">{enrollment.group.name}</p>
                  {enrollment.status === "PENDING" ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                      قيد المراجعة
                    </span>
                  ) : null}
                </div>
                {enrollment.group.tenantName && (
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {enrollment.group.tenantName}
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{enrollment.group.days.join(" • ")}</p>
                <p className="mt-2 text-sm font-semibold text-primary dark:text-sky-300">
                  <span dir="ltr">
                    {formatTimeRange12Hour(enrollment.group.timeStart, enrollment.group.timeEnd)}
                  </span>
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">لا توجد مجموعات مسجلة</p>
          )}
        </CardContent>
      </Card>

      {/* المجموعات المتاحة للانضمام */}
      {availableGroups && availableGroups.length > 0 && (
        <Card className="border border-slate-200 bg-white/50 backdrop-blur-[16px] dark:border-border-soft dark:bg-surface shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">المجموعات المتاحة للانضمام</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {availableGroups
              .filter(g => !data.profile?.enrollments.some(e => e.group.id === g.id))
              .map((group) => (
                <div
                  key={group.id}
                  className="rounded-[18px] border bg-white p-4 dark:bg-slate-900"
                  style={{ borderInlineStart: `4px solid ${group.color ?? "#1A5276"}` }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white">{group.name}</p>
                      <p className="text-sm text-slate-500 mt-1">{group.gradeLevel} — {group.subject}</p>
                      <p className="text-sm text-slate-500 mt-1">{group.days.join(" • ")}</p>
                      <p className="text-sm font-semibold text-primary mt-1" dir="ltr">
                        {formatTimeRange12Hour(group.timeStart, group.timeEnd)}
                      </p>
                    </div>
                    <div className="shrink-0 text-start sm:text-end">
                      <p className="text-lg font-extrabold text-primary">{group.monthlyFee} ج</p>
                      <p className="text-xs text-slate-500">{group.remainingCapacity} مقعد متبقي</p>
                    </div>
                  </div>

                  <JoinGroupButton 
                    groupId={group.id} 
                    isFull={group.isFull} 
                    isAlreadyPending={pendingGroupIds.includes(group.id)}
                  />
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JoinGroupButton({ 
  groupId, 
  isFull, 
  isAlreadyPending 
}: { 
  groupId: string; 
  isFull: boolean; 
  isAlreadyPending: boolean;
}) {
  const [isTransitioning, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'joined'>(
    isAlreadyPending ? 'joined' : 'idle'
  );

  function handleJoin() {
    startTransition(async () => {
      const result = await enrollStudentInGroup({ groupId });
      if (result.success) setStatus('joined');
      else alert(result.message);
    });
  }

  if (status === 'joined') {
    return (
      <div className="mt-3 w-full rounded-xl bg-amber-50 border border-amber-200 text-amber-700 py-2 text-center text-sm font-bold">
        ⏳ في انتظار موافقة المعلم
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={isFull || isTransitioning}
      className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold transition ${
        isFull
          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
          : "bg-primary text-white hover:bg-primary/90"
      }`}
    >
      {isTransitioning ? "جاري الإرسال..." : isFull ? "المجموعة ممتلئة" : "طلب الانضمام"}
    </button>
  );
}


