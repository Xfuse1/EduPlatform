'use client';

import { AlertCircle, Clock, PenTool, Target } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { toArabicDigits } from "@/lib/utils";

type ParentExamReportView = {
  id: string;
  childName: string;
  gradeLevel: string;
  lastCompleted: {
    title: string;
    score: number;
    maxScore: number;
    date: string;
    status: "excellent" | "good" | "average" | "poor";
  } | null;
  upcoming: {
    title: string;
    date: string;
    type: "online" | "offline";
  } | null;
};

interface ParentExamsProps {
  data: ParentExamReportView[];
}

export function ParentExams({ data }: ParentExamsProps) {
  const getScoreColor = (status: "excellent" | "good" | "average" | "poor") => {
    switch (status) {
      case "excellent":
        return "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100";
      case "good":
        return "text-sky-500 bg-sky-50 dark:bg-sky-950/30 border-sky-100";
      default:
        return "text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-100";
    }
  };

  if (!data.length) {
    return (
      <Card className="border-none shadow-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <CardContent className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 sm:p-6">
          لا توجد بيانات امتحانات مرتبطة بالأبناء حالياً.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-5 border-none bg-white/80 shadow-md backdrop-blur-sm dark:bg-slate-950/80 sm:mt-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 min-[420px]:flex-row min-[420px]:items-center sm:p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PenTool className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold sm:text-xl">تقرير الامتحانات والتقييمات</h2>
          <p className="text-sm text-slate-500">تابع مستوى وتطور أبنائك من خلال درجات الامتحانات الأخيرة.</p>
        </div>
      </div>

      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 sm:gap-6">
          {data.map((report) => (
            <div key={report.id} className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 sm:p-5">
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 dark:border-slate-800 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <h3 className="truncate text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">{report.childName}</h3>
                <span className="text-xs text-slate-400 font-bold bg-white dark:bg-slate-800 px-3 py-1 rounded-full">{report.gradeLevel}</span>
              </div>

              {report.lastCompleted ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 tracking-wider">الامتحان الأخير</h4>
                  <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{report.lastCompleted.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{report.lastCompleted.date}</p>
                    </div>
                    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border min-w-16 ${getScoreColor(report.lastCompleted.status)}`}>
                      <span className="text-lg font-black leading-none sm:text-xl">{toArabicDigits(report.lastCompleted.score)}</span>
                      <span className="text-[10px] font-bold opacity-70 mt-1 uppercase">من {toArabicDigits(report.lastCompleted.maxScore)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Target className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">لم يتم تسجيل نتيجة امتحان لهذا الابن بعد</p>
                </div>
              )}

              {report.upcoming && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-500 mb-1">تذكير بامتحان قادم</p>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-400">{report.upcoming.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-amber-700/80 dark:text-amber-500/80">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{report.upcoming.date}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
