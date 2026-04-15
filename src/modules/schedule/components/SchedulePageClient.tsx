'use client';

import { CalendarDays, Clock, ArrowRight, Video, FileCheck, Users, BookOpen, GraduationCap, ClipboardList, Send } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn, formatClockTime, formatTime12Hour, toArabicDigits } from "@/lib/utils";

type SchedulePageClientProps = {
  todaySessions: any[];
  upcomingExams: any[];
  pendingHomework: any[];
};

function formatArabicTime(value: string) {
  return formatTime12Hour(value);
}

export function SchedulePageClient({ todaySessions, upcomingExams, pendingHomework }: SchedulePageClientProps) {
  const today = new Date().toDateString();

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      {/* Header Section */}
      <header className="rounded-[32px] bg-[linear-gradient(135deg,_#111827,_#1F2937_60%,_#374151)] px-8 py-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold text-primary/80 mb-2">لوحة التحكم</p>
          <h1 className="text-4xl font-extrabold tracking-tight">نظرة عامة على اليوم</h1>
          <p className="mt-4 text-slate-400 leading-relaxed text-lg">
            تابع حصص اليوم، الامتحانات القادمة، وطلبات التصحيح المعلقة في مكان واحد.
          </p>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid gap-10">
        
        {/* 1. Today's Sessions Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">حصص اليوم</h2>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {toArabicDigits(todaySessions.length)} {todaySessions.length > 10 ? 'حصة' : 'حصص'}
            </span>
          </div>

          {todaySessions.length === 0 ? (
            <div className="rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center dark:border-slate-800 dark:bg-slate-900/30">
              <p className="text-slate-500 font-medium">لا توجد حصص مجدولة لليوم.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaySessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/attendance/${session.id}`}
                  className={cn(
                    "group relative flex flex-col p-5 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden",
                    "bg-white border-slate-200 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 dark:bg-slate-900/50 dark:border-slate-800 dark:hover:border-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="w-1.5 h-8 rounded-full" 
                      style={{ backgroundColor: session.group.color || '#1A5276' }} 
                    />
                    <Badge className="bg-slate-50 text-slate-500 border-none text-[10px] px-2 py-0.5 rounded-lg dark:bg-slate-800">
                       {session.group.groupStudents?.length || 0} طالب
                    </Badge>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-3 group-hover:text-primary">
                    {session.group.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Clock className="h-4 w-4 text-primary/60" />
                    <span dir="ltr">
                      {formatArabicTime(session.timeStart)} - {formatArabicTime(session.timeEnd)}
                    </span>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-50 flex items-center justify-between dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <FileCheck className="h-3.5 w-3.5" />
                      تسجيل الحضور
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 2. Upcoming Exams Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-xl">
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">الامتحانات القادمة</h2>
            </div>
            
            <div className="space-y-3">
              {upcomingExams.length === 0 ? (
                <div className="rounded-[24px] border border-slate-100 bg-slate-50/50 p-6 text-center dark:bg-slate-900/30">
                  <p className="text-slate-500">لا توجد امتحانات قادمة.</p>
                </div>
              ) : (
                upcomingExams.map((exam) => (
                  <Link key={exam.id} href={`/teacher/exams/${exam.id}/results`} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-purple-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-purple-50 text-purple-600 font-bold dark:bg-purple-900/20">
                        <span className="text-sm leading-none">{toArabicDigits(format(new Date(exam.startAt), 'd'))}</span>
                        <span className="text-[10px] uppercase">{format(new Date(exam.startAt), 'MMM', { locale: ar })}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{exam.title}</h4>
                        <p className="text-xs text-slate-500">{exam.description || 'لا يوجد وصف'}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* 3. Pending Homework Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/10 rounded-xl">
                <ClipboardList className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">تصحيح الواجبات</h2>
              {pendingHomework.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {toArabicDigits(pendingHomework.length)} جديد
                </span>
              )}
            </div>

            <div className="space-y-3">
              {pendingHomework.length === 0 ? (
                <div className="rounded-[24px] border border-slate-100 bg-slate-50/50 p-6 text-center dark:bg-slate-900/30">
                  <p className="text-slate-500">لا توجد واجبات معلقة للتصحيح.</p>
                </div>
              ) : (
                pendingHomework.map((sub) => (
                  <Link 
                    key={sub.id} 
                    href={`/teacher/assignments`}
                    className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-orange-200 cursor-pointer transition-colors dark:bg-slate-900 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center dark:bg-slate-800">
                        <Users className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{sub.student.name}</h4>
                        <p className="text-xs text-slate-500">{sub.assignment.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-slate-400">{formatClockTime(new Date(sub.submittedAt))}</span>
                       <Send className="h-4 w-4 text-orange-500" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border", className)}>
      {children}
    </span>
  );
}
