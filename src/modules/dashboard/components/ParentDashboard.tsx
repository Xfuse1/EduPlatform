'use client';

import { CalendarClock, CheckCircle2, CreditCard, UserRound, Bell, MessageSquare, Clock, BookOpen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatTime12Hour, toArabicDigits } from "@/lib/utils";


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

  if (!data) return null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Notifications Section */}
      {data.notifications && data.notifications.length > 0 && (
        <Card className="border-border-soft bg-surface backdrop-blur-[16px]">
          <CardContent className="p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
              <Bell className="h-4 w-4" />
              تنبيهات أخيرة
            </h3>
            <div className="space-y-2">
              {data.notifications.map((n: any) => (
                <div key={n.id} className="text-sm text-emerald-700 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-900 last:border-0 pb-2 last:pb-0">
                   {n.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-sections moved to separated pages */}


      {/* Stats Section */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border border-slate-200 bg-white/50 backdrop-blur-[16px] rounded-[16px] text-slate-900 dark:text-white dark:border-border-soft dark:bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(0,184,160,0.1)]">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] font-bold">إجمالي الأبناء</p>
            <p className="mt-3 text-2xl font-extrabold sm:text-3xl">{toArabicDigits(data.children.length)}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white/50 backdrop-blur-[16px] rounded-[16px] text-slate-900 dark:text-white dark:border-border-soft dark:bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(0,184,160,0.1)]">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] font-bold">متوسط الحضور</p>
            <p className="mt-3 text-2xl font-extrabold text-[#00B8A0] sm:text-3xl">
              {data.children.length
                ? `${toArabicDigits(
                    Math.round(
                      data.children.reduce((acc, c) => acc + (c.attendanceRate || 0), 0) /
                        data.children.length,
                    ),
                  )}%`
                : "٠٪"}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white/50 backdrop-blur-[16px] rounded-[16px] text-slate-900 dark:text-white dark:border-border-soft dark:bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(245,166,35,0.1)]">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] font-bold">حالة المصروفات</p>
            <p className="mt-3 text-lg font-extrabold text-[#F5A623]">
              {data.children.length > 0 && data.children.every((c) => c.payment.status === "PAID") ? "منتظمة بالكامل" : "تحتاج مراجعة"}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Main Grid for Schedule and Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule Section */}
        <Card className="border-border-soft bg-surface backdrop-blur-[16px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">جدول الحصص اليوم</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">حصص أبنائك المسجلة لهذا اليوم</p>
            </div>
            <Clock className="h-5 w-5 text-primary opacity-50" />
          </CardHeader>
          <CardContent className="px-6 py-4 space-y-4">
            {data.children.map(child => (
              <div key={child.id} className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{child.name}</span>
                </div>
                {child.nextSession ? (
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {formatTime12Hour(child.nextSession.timeStart)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{child.nextSession.group.name}</p>
                        <p className="text-[10px] text-slate-400">{formatSessionDate(new Date(child.nextSession.date))}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0">
                      حصة قادمة
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 pr-5">لا توجد حصص مسجلة اليوم.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance and Attendance Chart Section */}
        <Card className="border-border-soft bg-surface backdrop-blur-[16px] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">الأداء والتقدم</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">مؤشرات الحضور والدرجات خلال الفترة الأخيرة</p>
            </div>

            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Chart Area */}
            <div className="px-6 pt-4 pb-2 border-b border-dashed border-slate-100 dark:border-slate-800">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2">معدل الحضور العام</p>
                <span className="text-lg font-black text-primary dark:text-sky-400">
                  {toArabicDigits(
                    data.children.length > 0 
                      ? Math.round(data.children.reduce((acc, c) => acc + (c.attendanceRate || 0), 0) / data.children.length)
                      : 0
                  )}%
                </span>
              </div>
              <Progress 
                value={data.children.length > 0 ? data.children.reduce((acc, c) => acc + (c.attendanceRate || 0), 0) / data.children.length : 0} 
                className="h-2 mb-4" 
              />
            </div>
            
            {/* Recent Grades */}
            <div className="space-y-4 p-4 sm:p-6">
              <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <BookOpen className="h-3 w-3" />
                آخر درجات الواجبات
              </p>
              <div className="space-y-2">
                {(data.assignments as any[]).map(assignment => (
                  <div key={assignment.id} className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 p-2 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{assignment.title}</span>
                      <span className="text-[9px] text-slate-400">{assignment.childName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.gradedByAi && <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />}
                      <span className="text-[11px] font-extrabold text-primary dark:text-sky-400">{toArabicDigits(assignment.grade)}/{toArabicDigits(assignment.maxGrade)}</span>
                      <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-primary dark:bg-sky-400" style={{ width: `${(assignment.grade/assignment.maxGrade)*100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {data.assignments?.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-4">لا توجد درجات مسجلة حالياً.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Children Detail Cards (Original Section) */}
      <div className="space-y-6 pt-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" />
          تفاصيل الأبناء
        </h3>
        {data.children.length === 0 ? (
          <Card className="border-border-soft bg-surface backdrop-blur-[16px]">
            <CardContent className="p-4 sm:p-6 text-sm text-slate-500 dark:text-slate-300">لا توجد بيانات أبناء مرتبطة بهذا الحساب</CardContent>
          </Card>
        ) : (
          data.children.map((child) => (
            <Card key={child.id} className="overflow-hidden border border-border-soft bg-surface backdrop-blur-[16px]">
              <div className="bg-[linear-gradient(135deg,rgba(26,43,109,0.6),rgba(0,184,160,0.1))] px-6 py-5 border-b border-border-soft">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-extrabold text-primary dark:text-sky-300 sm:text-2xl">{child.name}</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 font-bold">{child.grade}</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm dark:bg-slate-900 dark:text-sky-300">
                    <UserRound className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <CardContent className="space-y-5 p-4 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-4 rounded-[20px] bg-slate-50 p-4 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">حالة اليوم</p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{todayStatusLabel(child.todayStatus)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-[20px] bg-slate-50 p-4 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <CreditCard className="mt-1 h-5 w-5 text-primary dark:text-sky-300" />
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">المصروفات</p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                        {child.payment.status === "PAID" ? "تم السداد بالكامل" : `${formatCurrency(child.payment.amount)} متبقي`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] bg-slate-50 p-5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">نسبة الحضور الكلية</p>
                    <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{toArabicDigits(child.attendanceRate)}%</p>
                  </div>
                  <Progress className="h-3" value={child.attendanceRate} />
                </div>

                {child.currentGroups?.length ? (
                  <div className="rounded-[20px] bg-slate-50 p-5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <p className="mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">المجموعات الحالية</p>
                    <div className="flex flex-wrap gap-2">
                      {child.currentGroups.map((group: any) => (
                        <span key={group.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                          {group.name}
                          {group.tenantName ? ` - ${group.tenantName}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-4 rounded-[20px] bg-slate-50 p-5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <CalendarClock className="mt-1 h-6 w-6 text-primary dark:text-sky-300" />
                  <div className="flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">الحصة القادمة</p>
                        <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                          {child.nextSession ? `${child.nextSession.group.name}` : "لا توجد حصة قادمة"}
                        </p>
                        {child.nextSession && (
                          <p className="mt-1 text-xs text-slate-500 font-medium">{formatSessionDate(child.nextSession.date)} • {formatTime12Hour(child.nextSession.timeStart)}</p>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        className="h-9 w-full rounded-xl border-slate-200 px-3 text-[11px] font-bold sm:h-8 sm:w-auto"
                        onClick={() => window.location.href = '/parent/attendance'}
                      >
                        سجل الحضور
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 rounded-2xl text-sm font-bold border-primary/20 text-primary hover:bg-primary/5 min-h-[50px]"
                    onClick={() => window.location.href = `/messages${child.nextSession?.teacherId ? `?contact=${child.nextSession.teacherId}` : ''}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    راسل المدرس
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex-1 gap-2 rounded-2xl text-sm font-bold min-h-[50px]"
                    onClick={() => window.location.href = `/payments?childId=${child.id}`}
                  >
                    عرض الفواتير
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
