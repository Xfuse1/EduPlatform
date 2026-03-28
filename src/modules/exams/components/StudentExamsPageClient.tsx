'use client';

import { Calendar, Clock, CheckCircle, PenTool, ExternalLink, Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toArabicDigits } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  examDate: Date | string;
  durationMinutes: number;
  maxScore: number;
  status: "upcoming" | "active" | "completed";
  myScore?: number | null;
  examLink?: string;
}

interface StudentExamsPageClientProps {
  initialExams: Exam[];
}

export function StudentExamsPageClient({ initialExams = [] }: StudentExamsPageClientProps) {
  // Using Mock Data representing the student view 
  // until actual Backend API for student exams is ready
  const mockExams: Exam[] = initialExams.length > 0 ? initialExams : [
      {
          id: "1",
          title: "امتحان الشهر الأول - فيزياء",
          description: "برجاء الاستعداد جيداً ومراجعة الفصلين الأول والثاني، الامتحان سيكون عبر جوجل فورم.",
          examDate: new Date(Date.now() - 86400000).toISOString(),
          durationMinutes: 60,
          maxScore: 100,
          status: "completed",
          myScore: 85,
      },
      {
          id: "2",
          title: "الكويز الأسبوعي - الحركة الموجية",
          description: "كويز مفاجئ سريع، مدته 15 دقيقة فقط",
          examDate: new Date(Date.now() + 300000).toISOString(),
          durationMinutes: 15,
          maxScore: 20,
          status: "active",
          examLink: "https://docs.google.com/forms"
      },
      {
          id: "3",
          title: "امتحان نصف العام المجمع",
          description: "الامتحان النصفي على جميع فصول المنهج المكتملة",
          examDate: new Date(Date.now() + 172800000).toISOString(),
          durationMinutes: 120,
          maxScore: 150,
          status: "upcoming",
      }
  ];

  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredExams = exams.filter((e) => {
    if (filterStatus === "all") return true;
    return e.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 uppercase tracking-widest text-[10px] font-extrabold px-3 py-1">قادم</Badge>;
      case "active":
        return <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 animate-pulse uppercase tracking-widest text-[10px] font-extrabold px-3 py-1">متاح الآن</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 uppercase tracking-widest text-[10px] font-extrabold px-3 py-1">مكتمل</Badge>;
      default:
        return null;
    }
  }

  const handleStartExam = (link?: string) => {
      if (link) {
          window.open(link, "_blank");
      } else {
          // If no link, it might be an in-person exam or a downloaded PDF.
          // For now, simple alert or handled by future logic.
          alert("الامتحان ورقي في السنتر أو لا يحتوي على رابط حالياً.");
      }
  };

  return (
    <div className="space-y-8 min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">امتحاناتي</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">تابع مواعيد امتحاناتك وراجع نتائجك السابقة لتقييم مستواك.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button 
                onClick={() => setFilterStatus("all")}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterStatus === "all" ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
                الكل
            </button>
            <button 
                onClick={() => setFilterStatus("active")}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all relative ${filterStatus === "active" ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
                متاح الآن
                <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </button>
            <button 
                onClick={() => setFilterStatus("completed")}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterStatus === "completed" ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
                المنتهية
            </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {filteredExams.map((exam) => (
          <Card key={exam.id} className="group overflow-hidden rounded-[24px] border border-slate-200 shadow-sm dark:border-slate-800 transition hover:shadow-md hover:border-primary/20 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row">
                <div className="flex-1 p-6 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                            <h3 className="text-[1.15rem] font-bold text-slate-900 dark:text-white leading-tight">{exam.title}</h3>
                            {exam.description && (
                                <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">{exam.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                        <div className="flex items-center gap-2 rounded-[10px] bg-slate-50 px-3 py-1.5 text-slate-700 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-300">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold leading-none">{new Date(exam.examDate).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-[10px] bg-sky-50 px-3 py-1.5 text-sky-700 border border-sky-100 dark:bg-sky-900/30 dark:border-sky-800/50 dark:text-sky-300">
                            <Clock className="h-4 w-4 text-sky-500" />
                            <span className="text-xs font-bold leading-none">{toArabicDigits(exam.durationMinutes)} دقيقة</span>
                        </div>
                    </div>
                </div>

                {/* Right Side / Actions */}
                <div className="flex flex-row sm:flex-col sm:w-48 bg-slate-50/50 dark:bg-slate-800/20 border-t sm:border-t-0 sm:border-r border-slate-100 dark:border-slate-800 p-6 items-center sm:items-stretch justify-center gap-4">
                    <div className="mx-auto block">
                        {getStatusBadge(exam.status)}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center">
                        {exam.status === "upcoming" && (
                            <div className="text-center space-y-1">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">تاريخ البداية</span>
                                <span className="block text-sm font-extrabold text-slate-700 dark:text-slate-300">{new Date(exam.examDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}
                        
                        {exam.status === "active" && (
                            <Button 
                                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold h-11 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 active:h-10 mt-1 transition-all"
                                onClick={() => handleStartExam(exam.examLink)}
                            >
                                بدء الاختبار
                                <ExternalLink className="mr-2 h-4 w-4" />
                            </Button>
                        )}
                        
                        {exam.status === "completed" && (
                            <div className="text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-2 shadow-sm">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">الدرجة النهائية</span>
                                <div className="flex items-baseline justify-center gap-1 text-primary">
                                    <span className="text-2xl font-black">{toArabicDigits(exam.myScore || "0")}</span>
                                    <span className="text-sm font-bold text-slate-400">/ {toArabicDigits(exam.maxScore)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </Card>
        ))}

        {filteredExams.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center space-y-5 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="h-24 w-24 rounded-full bg-white shadow-sm flex items-center justify-center dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-900">
                    <PenTool className="h-10 w-10 text-slate-300" />
                </div>
                <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">لا توجد امتحانات</h3>
                    <p className="mt-2 text-slate-500 text-sm font-medium">ليس لديك أي امتحانات في هذا التصنيف حالياً. استرح قليلاً واستعد للقادم.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
