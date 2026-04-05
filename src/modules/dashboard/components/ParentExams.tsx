'use client';

import { PenTool, Target, Clock, AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { toArabicDigits } from "@/lib/utils";

interface ParentExamsProps {
  data?: any[]; // Keep any intentionally for mock flexibility
}

// Mock Data for the Exams Results & Upcoming
const MOCK_EXAM_REPORTS = [
    {
        id: "1",
        childName: "أحمد منصور",
        gradeLevel: "الصف الثاني الثانوي",
        lastCompleted: {
            title: "امتحان الشهر الأول - فيزياء",
            score: 85,
            maxScore: 100,
            date: "12 أكتوبر 2026",
            status: "good" // good, average, poor
        },
        upcoming: {
            title: "كويز تفاعلي - الحركة الموجية",
            date: "غداً - 3:00 عصراً",
            type: "online" // online, offline
        }
    },
    {
        id: "2",
        childName: "مريم منصور",
        gradeLevel: "الصف الثالث الإعدادي",
        lastCompleted: {
            title: "امتحان نصف العام المجمع",
            score: 42,
            maxScore: 50,
            date: "10 نوقمبر 2026",
            status: "excellent"
        },
        upcoming: null
    }
];

export function ParentExams({ data = MOCK_EXAM_REPORTS }: ParentExamsProps) {
  
  const getScoreColor = (status: string) => {
      switch (status) {
          case 'excellent': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100';
          case 'good': return 'text-sky-500 bg-sky-50 dark:bg-sky-950/30 border-sky-100';
          default: return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-100';
      }
  };

  return (
    <Card className="border-none shadow-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-6">
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PenTool className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">تقرير الامتحانات والتقييمات</h2>
          <p className="text-sm text-slate-500">تابع مستوى وتطور أبنائك من خلال درجات الامتحانات الأخيرة.</p>
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
            {data.map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{report.childName}</h3>
                        <span className="text-xs text-slate-400 font-bold bg-white dark:bg-slate-800 px-3 py-1 rounded-full">{report.gradeLevel}</span>
                    </div>

                    {/* Last Completed Exam details */}
                    {report.lastCompleted ? (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 tracking-wider">الامتحان الأخير</h4>
                            
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{report.lastCompleted.title}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{report.lastCompleted.date}</p>
                                </div>
                                <div className={`flex flex-col items-center justify-center p-2 rounded-xl border min-w-16 ${getScoreColor(report.lastCompleted.status)}`}>
                                    <span className="text-xl font-black leading-none">{toArabicDigits(report.lastCompleted.score)}</span>
                                    <span className="text-[10px] font-bold opacity-70 mt-1 uppercase">من {toArabicDigits(report.lastCompleted.maxScore)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Target className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 font-bold">لم يختبر أي امتحانات حتى الآن</p>
                        </div>
                    )}

                    {/* Upcoming Exam Alert */}
                    {report.upcoming && (
                        <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
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
