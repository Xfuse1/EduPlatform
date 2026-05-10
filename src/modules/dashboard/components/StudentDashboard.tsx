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

      <Card className="overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(26,43,109,0.6),rgba(0,184,160,0.1))] backdrop-blur-[16px] rounded-[16px] text-white shadow-2xl">
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-[#94A3B8]">الحصة القادمة</p>
          {data.nextSession ? (
            <div className="mt-4 space-y-3">
              <p className="text-2xl font-extrabold">{data.nextSession.group.name}</p>
              <p className="text-sm text-white/85">{nextSessionDate || formatArabicDate(data.nextSession.date)}</p>
              <p className="flex items-center gap-2 text-sm text-white/85">
                <Clock3 className="h-4 w-4" />
                <span dir="ltr">
                  {formatTimeRange12Hour(data.nextSession.timeStart, data.nextSession.timeEnd)}
                </span>
              </p>
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-[#00B8A0]">متبقي يومان على الحصة</div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/80">لا توجد حصة قادمة مسجلة الآن</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] backdrop-blur-[16px] rounded-[16px] text-white shadow-[0_0_20px_rgba(0,184,160,0.1)]">
          <CardHeader>
            <CardTitle className="text-[#94A3B8]">نسبة الحضور هذا الشهر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm font-bold text-white">
              <span>الالتزام</span>
              <span className="text-[#00B8A0]">{toArabicDigits(data.attendance.rate)}%</span>
            </div>
            <Progress className="h-3" value={data.attendance.rate} />
            <p className="text-sm text-[#94A3B8]">معدل الحضور ممتاز هذا الشهر واستمرارك بنفس المستوى مهم.</p>
          </CardContent>
        </Card>

        <Card className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] backdrop-blur-[16px] rounded-[16px] text-white shadow-[0_0_20px_rgba(245,166,35,0.1)]">
          <CardHeader>
            <CardTitle className="text-[#94A3B8]">حالة المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            {data.payment.status === "PAID" ? (
              <div className="flex items-center gap-3 rounded-[18px] bg-white/5 p-4 text-[#00B8A0] border border-[#00B8A0]/20">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold">تم السداد بالكامل</p>
                  <p className="text-sm text-[#94A3B8]">لا توجد مبالغ مستحقة حالياً</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[18px] bg-white/5 p-4 text-[#F5A623] border border-[#F5A623]/20">
                <Wallet className="h-8 w-8" />
                <div>
                  <p className="font-bold">{formatCurrency(data.payment.amount)}</p>
                  <p className="text-sm text-[#94A3B8]">مبلغ مستحق يحتاج إلى متابعة</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] backdrop-blur-[16px]">
        <CardHeader>
          <CardTitle>مجموعاتي</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {data.profile?.enrollments.length ? (
            data.profile.enrollments.map((enrollment, index) => (
              <div key={enrollment.group.id} className="rounded-[18px] border bg-white p-4 dark:bg-slate-900">
                <div className="mb-4 h-1.5 rounded-full" style={{ backgroundColor: groupColors[index % groupColors.length] }} />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{enrollment.group.name}</p>
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
        <Card className="border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] backdrop-blur-[16px]">
          <CardHeader>
            <CardTitle>المجموعات المتاحة للانضمام</CardTitle>
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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{group.name}</p>
                      <p className="text-sm text-slate-500 mt-1">{group.gradeLevel} — {group.subject}</p>
                      <p className="text-sm text-slate-500 mt-1">{group.days.join(" • ")}</p>
                      <p className="text-sm font-semibold text-primary mt-1" dir="ltr">
                        {formatTimeRange12Hour(group.timeStart, group.timeEnd)}
                      </p>
                    </div>
                    <div className="text-end">
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


