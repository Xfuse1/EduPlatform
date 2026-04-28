'use client';

import { CalendarClock, CheckCircle2, CreditCard, UserRound, Bell, MessageSquare, Clock, BookOpen, AlertTriangle, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { BarChart, Bar, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatTime12Hour, toArabicDigits, cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";

type ParentDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getParentDashboardData>>;
};


function todayStatusLabel(status: string) {
  if (status === "PRESENT") return "حضر اليوم";
  if (status === "ABSENT") return "غاب اليوم";
  return "لا توجد حصة اليوم";
}

export function ParentDashboard({ data }: ParentDashboardProps) {
  const [showBanner, setShowBanner] = useState(true);
  
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
      {/* Subscription Expiry Banner */}
      {showBanner && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top duration-500">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">تنبيه انتهاء الاشتراك</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400">اشتراكك ينتهي خلال 5 أيام — يرجى التجديد لضمان استمرار الخدمة.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                className="bg-amber-600 hover:bg-amber-700 text-white min-h-10 px-6 rounded-xl text-xs font-bold shadow-none"
                onClick={() => window.location.href = '/payments'}
              >
                جدد الآن
              </Button>
              <Button 
                variant="ghost" 
                className="h-10 w-10 p-0 text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900" 
                onClick={() => setShowBanner(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Section */}
      {data.notifications && data.notifications.length > 0 && (
        <Card className="border-emerald-100 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
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
        <Card className="bg-[linear-gradient(135deg,_#1A5276,_#2E86C1)] text-white">
          <CardContent className="p-6">
            <p className="text-sm text-white/75 font-medium">إجمالي الأبناء</p>
            <p className="mt-3 text-3xl font-extrabold">{toArabicDigits(data.children.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">متوسط الحضور</p>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
              {data.children.length ? `${toArabicDigits(data.children[0].attendanceRate)}%` : "٠٪"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">حالة المصروفات</p>
            <p className="mt-3 text-lg font-extrabold text-emerald-600 dark:text-emerald-300">
              {data.children[0]?.payment.status === "PAID" ? "منتظمة بالكامل" : "تحتاج مراجعة"}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Main Grid for Schedule and Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule Section */}
        <Card className="border-none shadow-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-bold">جدول الحصص اليوم</CardTitle>
              <p className="text-xs text-slate-400 mt-1">حصص أبنائك المسجلة لهذا اليوم</p>
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
                  <div key={child.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {formatTime12Hour(child.nextSession.timeStart)}
                      </div>
                      <div>
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
        <Card className="border-none shadow-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-bold">الأداء والتقدم</CardTitle>
              <p className="text-xs text-slate-400 mt-1">مؤشرات الحضور والدرجات خلال الفترة الأخيرة</p>
            </div>

            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Chart Area */}
            <div className="px-6 pt-4 pb-2 border-b border-dashed border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-500 px-2">معدل الحضور العام</p>
                <span className="text-lg font-black text-primary">
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
            <div className="p-6 space-y-4">
              <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <BookOpen className="h-3 w-3" />
                آخر درجات الواجبات
              </p>
              <div className="space-y-2">
                {(data.assignments as any[]).map(assignment => (
                  <div key={assignment.id} className="flex items-center justify-between p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{assignment.title}</span>
                      <span className="text-[9px] text-slate-400">{assignment.childName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.gradedByAi && <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />}
                      <span className="text-[11px] font-extrabold text-primary">{toArabicDigits(assignment.grade)}/{toArabicDigits(assignment.maxGrade)}</span>
                      <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(assignment.grade/assignment.maxGrade)*100}%` }} />
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
          <Card>
            <CardContent className="p-6 text-sm text-slate-500 dark:text-slate-300">لا توجد بيانات أبناء مرتبطة بهذا الحساب</CardContent>
          </Card>
        ) : (
          data.children.map((child) => (
            <Card key={child.id} className="overflow-hidden border-none shadow-md">
              <div className="bg-[linear-gradient(135deg,_rgba(26,82,118,0.12),_rgba(46,134,193,0.18))] px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-primary dark:text-sky-300">{child.name}</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 font-bold">{child.grade}</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm dark:bg-slate-900 dark:text-sky-300">
                    <UserRound className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <CardContent className="space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-4 rounded-[20px] bg-slate-50 p-4 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">حالة اليوم</p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{todayStatusLabel(child.todayStatus)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-[20px] bg-slate-50 p-4 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <CreditCard className="mt-1 h-5 w-5 text-primary dark:text-sky-300" />
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">المصروفات</p>
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
                    <div className="flex justify-between items-start">
                      <div>
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
                        className="rounded-xl border-slate-200 text-[11px] font-bold h-8 px-3"
                        onClick={() => window.location.href = '/parent/attendance'}
                      >
                        سجل الحضور
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
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
