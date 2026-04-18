'use client';

import { useState } from "react";
import { 
  Users, 
  Search, 
  ClipboardCheck, 
  Sparkles, 
  Clock,
  Phone,
  ArrowRight,
  Eye,
  Save,
  Loader2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { toArabicDigits } from "@/lib/utils";
import { toast } from "sonner";
import {
  updateExamSubmissionAction,
  aiGradeExamAction,
  approveAutoGradeByModelAnswerAction,
} from "../actions";

const submittedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Cairo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatSubmittedAt(value: Date | string) {
  const date = new Date(value);
  const parts = submittedAtFormatter.formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${toArabicDigits(`${day}/${month}`)} ${toArabicDigits(`${hour}:${minute}`)}`;
}

function normalizeTrueFalse(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (["true", "صح", "صحيح", "yes", "1"].includes(normalized)) return "true";
  if (["false", "خطأ", "خطا", "غلط", "no", "0"].includes(normalized)) return "false";
  return "";
}

interface ExamResultsClientProps {
  exam: {
    id: string;
    title: string;
    questions: {
      id: string;
      questionText: string;
      type: "MCQ" | "ESSAY" | "TRUE_FALSE";
      options: any;
      correctAnswer: string | null;
      grade: number;
    }[];
    submissions: {
      id: string;
      studentId: string;
      answers: Record<string, string>;
      totalGrade: number | null;
      aiGrade: number | null;
      aiFeedback: string | null;
      teacherComment: string | null;
      gradedByAi: boolean;
      submittedAt: Date | string;
      student: {
        id: string;
        name: string;
        phone: string;
      };
    }[];
  };
}

export function ExamResultsClient({ exam }: ExamResultsClientProps) {
  const [submissions, setSubmissions] = useState(exam.submissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<typeof exam.submissions[0] | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiGrading, setIsAiGrading] = useState(false);
  const [isAutoApproving, setIsAutoApproving] = useState(false);
  const [localGrade, setLocalGrade] = useState<number | null>(null);
  const [localComment, setLocalComment] = useState("");

  const filteredSubmissions = submissions.filter(s => 
    s.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student.phone.includes(searchQuery)
  );

  const handleOpenDetail = (submission: typeof exam.submissions[0]) => {
    setSelectedSubmission(submission);
    setLocalGrade(submission.totalGrade);
    setLocalComment(submission.teacherComment || "");
    setIsDetailOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;
    setIsSaving(true);
    try {
      const res = await updateExamSubmissionAction(selectedSubmission.id, localGrade || 0, localComment);
      if (res.success) {
        toast.success("تم حفظ الدرجة بنجاح");
        setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, totalGrade: localGrade, teacherComment: localComment } : s));
      } else {
        toast.error(res.error || "فشل حفظ الدرجة");
      }
    } catch (error) {
      toast.error("حدث خطأ ما");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiGrade = async () => {
    if (!selectedSubmission) return;
    setIsAiGrading(true);
    try {
      const response = await fetch("/api/exams/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          submissionId: selectedSubmission.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("AI Grading failed:", errorData);
        throw new Error(errorData.error || "فشل التصحيح الآلي");
      }

      const data = await response.json();
      setLocalGrade(data.grade);
      setLocalComment(data.summary);
      
      // Update state for both the list and the selection
      const updatedData = {
        aiGrade: data.grade,
        aiFeedback: data.summary,
        totalGrade: data.grade
      };

      setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, ...updatedData } : s));
      setSelectedSubmission(prev => prev ? { ...prev, ...updatedData } : null);

      toast.success("تم التصحيح بالذكاء الاصطناعي");
    } catch (error: any) {
      console.error("AI Grading Error:", error);
      toast.error(error.message || "حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setIsAiGrading(false);
    }
  };

  const handleApproveAutoGrade = async () => {
    if (!selectedSubmission) return;

    setIsAutoApproving(true);
    try {
      const result = await approveAutoGradeByModelAnswerAction(exam.id, selectedSubmission.id);

      if (!result.success || !result.data) {
        toast.error(result.error || "فشل اعتماد التصحيح التلقائي");
        return;
      }

      const updatedData = {
        totalGrade: result.data.grade,
        teacherComment: result.data.teacherComment,
        gradedByAi: result.data.gradedByAi,
      };

      setLocalGrade(result.data.grade);
      setLocalComment(result.data.teacherComment || "");
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selectedSubmission.id ? { ...s, ...updatedData } : s))
      );
      setSelectedSubmission((prev) => (prev ? { ...prev, ...updatedData } : null));

      toast.success("تم اعتماد التصحيح التلقائي بنجاح");
    } catch (error) {
      console.error("Auto-grade approval error:", error);
      toast.error("حدث خطأ أثناء اعتماد التصحيح التلقائي");
    } finally {
      setIsAutoApproving(false);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
           <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Button variant="ghost" onClick={() => window.location.href='/teacher/exams'} className="p-0 h-auto min-h-0 hover:bg-transparent hover:text-primary">
                 <ArrowRight className="h-4 w-4 ml-1" />
                 العودة للامتحانات
              </Button>
           </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
             <ClipboardCheck className="h-8 w-8 text-primary" />
             نتائج: {exam.title}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">عرض وتقييم إجابات الطلاب ورصد الدرجات النهائية.</p>
        </div>
        <Button 
          onClick={() => window.location.href = '/teacher/exams?new=true'}
          className="min-h-12 px-6 shadow-lg shadow-primary/20"
        >
          <Plus className="me-2 h-5 w-5" />
          إضافة امتحان جديد
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">بحث عن طالب</label>
              <div className="relative">
                  <Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="اسم الطالب أو رقم الهاتف..." 
                    className="pr-10 min-h-11 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
          </div>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="p-4 font-bold text-slate-700 dark:text-slate-200 border-b">اسم الطالب</th>
                <th className="p-4 font-bold text-slate-700 dark:text-slate-200 border-b">رقم الهاتف</th>
                <th className="p-4 font-bold text-slate-700 dark:text-slate-200 border-b">وقت التسليم</th>
                <th className="p-4 font-bold text-slate-700 dark:text-slate-200 border-b">الدرجة</th>
                <th className="p-4 font-bold text-slate-700 dark:text-slate-200 border-b">الحالة</th>
                <th className="p-4 font-bold text-slate-700 dark:text-slate-200 border-b text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((s) => {
                const isGradeApproved = s.teacherComment !== null || s.gradedByAi === true;
                return (
                  <tr key={s.id} className="group border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-4">
                     <div className="font-bold text-slate-900 dark:text-white">{s.student.name}</div>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-500">
                     <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {s.student.phone}
                     </div>
                  </td>
                  <td className="p-4 text-slate-500 text-xs">
                     <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatSubmittedAt(s.submittedAt)}
                     </div>
                  </td>
                  <td className="p-4">
                     <div className="flex items-center gap-1">
                        <span className={`text-lg font-extrabold ${isGradeApproved ? 'text-primary' : 'text-slate-300'}`}>
                           {isGradeApproved ? toArabicDigits(s.totalGrade) : '--'}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">/ {toArabicDigits(exam.questions.reduce((a, b) => a + b.grade, 0))}</span>
                     </div>
                  </td>
                  <td className="p-4">
                      {isGradeApproved ? (
                         <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400">تم اعتماد الدرجة</Badge>
                      ) : (
                         <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">في انتظار المراجعة</Badge>
                      )}
                  </td>
                  <td className="p-4 text-left">
                    <Button variant="ghost" className="h-auto py-2 group-hover:bg-white shadow-sm rounded-lg" onClick={() => handleOpenDetail(s)}>
                      <Eye className="h-4 w-4 ml-1.5" />
                       عرض الإجابات
                    </Button>
                  </td>
                  </tr>
                );
              })}
              {filteredSubmissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500 font-bold">
                    لا توجد نتائج مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Submission Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl rounded-[32px] bg-slate-50 dark:bg-slate-950" dir="rtl">
          <DialogHeader className="px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                 <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group transition-all hover:bg-primary/10">
                    <Users className="h-7 w-7 transition-transform group-hover:scale-110" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{selectedSubmission?.student.name}</h2>
                    <p className="text-sm font-bold text-slate-400 mt-2">مراجعة الإجابات وتسجيل الدرجة</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <Button
                   onClick={handleApproveAutoGrade}
                   disabled={isAutoApproving || isAiGrading}
                   variant="outline"
                   className="h-11 px-5 rounded-2xl border-slate-200 text-slate-600 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 font-bold hover:border-primary/30 hover:text-primary transition-all shadow-sm"
                 >
                    {isAutoApproving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <ClipboardCheck className="h-4 w-4 ml-2" />}
                    تصحيح تلقائي
                 </Button>
                 <Button 
                    onClick={handleAiGrade} 
                    disabled={isAiGrading || isAutoApproving}
                    className="h-11 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                 >
                    {isAiGrading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Sparkles className="h-4 w-4 ml-2" />}
                    تصحيح بالـ AI
                 </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-10 scrollbar-none">
            {exam.questions.map((question, index) => {
              const studentAnswer = selectedSubmission?.answers[question.id];
              const normalizedStudentTf = normalizeTrueFalse(studentAnswer);
              const normalizedCorrectTf = normalizeTrueFalse(question.correctAnswer);

              return (
                <div key={question.id} className="relative group">
                  {/* Vertical Line Connector */}
                  {index < exam.questions.length - 1 && (
                    <div className="absolute top-12 bottom-[-40px] right-6 w-0.5 bg-slate-100 dark:bg-slate-800 z-0" />
                  )}

                  <div className="relative z-10 flex gap-6">
                    {/* Number Circle */}
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border-2 border-slate-100 text-lg font-black text-slate-300 dark:bg-slate-900 dark:border-slate-800 transition-all group-hover:border-primary group-hover:text-primary">
                        {toArabicDigits(index + 1)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-5">
                      {/* Question Text and Grade */}
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed pt-1 break-all">
                          {question.questionText}
                        </p>
                        <Badge variant="outline" className="h-8 rounded-xl border-slate-100 bg-white px-3 font-bold text-slate-400 dark:bg-slate-900 dark:border-slate-800">
                          {toArabicDigits(question.grade)} درجة
                        </Badge>
                      </div>

                      {/* Options & Answers */}
                      <div className="pr-2">
                        {/* MCQ */}
                        {question.type === 'MCQ' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.isArray(question.options) && question.options.map((opt, i) => {
                              const isCorrect = opt === question.correctAnswer;
                              const isStudentChoice = opt === studentAnswer;
                              
                              return (
                                <div 
                                  key={i} 
                                  className={`flex items-center gap-3 rounded-2xl p-4 border transition-all
                                    ${isCorrect 
                                      ? 'border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                      : isStudentChoice
                                        ? 'border-red-500/20 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                                        : 'border-white bg-white text-slate-500 dark:border-slate-900 dark:bg-slate-900'
                                    }`}
                                >
                                  <div className={`h-2.5 w-2.5 rounded-full ${isCorrect ? 'bg-emerald-500' : isStudentChoice ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                                  <span className="flex-1 font-bold">{opt}</span>
                                  {isStudentChoice && (
                                    <Badge className={`${isCorrect ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[10px] rounded-full border-none px-2 py-0`}>إجابة الطالب</Badge>
                                  )}
                                  {isCorrect && !isStudentChoice && (
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">صحيحة</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* TRUE_FALSE */}
                        {question.type === 'TRUE_FALSE' && (
                          <div className="flex gap-4">
                            {[
                              { value: "true", label: "صح" },
                              { value: "false", label: "خطأ" },
                            ].map((option) => {
                              const isCorrect = option.value === normalizedCorrectTf;
                              const isStudentChoice = option.value === normalizedStudentTf;

                              return (
                                <div 
                                  key={option.value} 
                                  className={`flex-1 flex items-center justify-center gap-3 rounded-2xl p-4 border transition-all font-bold
                                    ${isCorrect 
                                      ? 'border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                      : isStudentChoice
                                        ? 'border-red-500/20 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                                        : 'border-white bg-white text-slate-500 dark:border-slate-900 dark:bg-slate-900'
                                    }`}
                                >
                                  {option.label}
                                  {isStudentChoice && (
                                    <Badge className={`${isCorrect ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[9px] rounded-full border-none`}>إجابة الطالب</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* ESSAY */}
                        {question.type === 'ESSAY' && (
                          <div className="space-y-4">
                            <div className="relative overflow-hidden rounded-2xl bg-white border-r-4 border-slate-100 p-5 dark:bg-slate-900 dark:border-slate-800">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">إجابة الطالب</p>
                               <p className="text-base font-bold text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all leading-relaxed">
                                  {studentAnswer || <span className="italic text-slate-400">(بدون إجابة)</span>}
                               </p>
                            </div>
                            <div className="relative overflow-hidden rounded-2xl bg-emerald-50/30 border-r-4 border-emerald-500/20 p-5 dark:bg-emerald-950/10 dark:border-emerald-900/30">
                               <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">الإجابة النموذجية</p>
                               <p className="text-base font-bold text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
                                  {question.correctAnswer}
                                </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="px-8 py-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-6">
              <div className="w-full space-y-6">
                 {selectedSubmission?.aiFeedback && (
                    <div className="group relative p-6 bg-slate-50 border border-slate-100 rounded-[24px] dark:bg-slate-950 dark:border-slate-800 overflow-hidden">
                      <div className="absolute top-0 right-0 h-full w-1.5 bg-indigo-500 opacity-20" />
                      <div className="flex items-center gap-2 mb-3">
                         <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center dark:bg-indigo-900/30 dark:text-indigo-400">
                           <Sparkles className="h-3.5 w-3.5" />
                         </div>
                         <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">تقييم الذكاء الاصطناعي</p>
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed mb-4 whitespace-pre-wrap">
                        {selectedSubmission.aiFeedback}
                      </p>
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 rounded-xl px-4 py-1.5 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800">
                         الدرجة المقترحة: <span className="text-lg font-black mr-2">{toArabicDigits(selectedSubmission.aiGrade || 0)}</span>
                      </Badge>
                    </div>
                 )}
                 
                 <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-3">
                       <label className="text-sm font-black text-slate-500 dark:text-slate-400 pr-2">تعليق المعلم (اختياري)</label>
                       <Input 
                         value={localComment || ""}
                         onChange={(e) => setLocalComment(e.target.value)}
                         placeholder="اكتب ملاحظاتك للطالب هنا..."
                         className="h-14 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold px-6 dark:bg-slate-950 dark:text-white"
                       />
                    </div>
                    
                    <div className="w-full md:w-32 space-y-3">
                       <label className="text-sm font-black text-slate-500 dark:text-slate-400 text-center block">الدرجة</label>
                       <Input 
                         type="number" 
                         value={localGrade ?? 0} 
                         onChange={(e) => setLocalGrade(parseInt(e.target.value) || 0)}
                         className="h-14 text-center text-2xl font-black text-primary bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-primary/5 transition-all dark:bg-slate-950 dark:text-white"
                       />
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <Button 
                      onClick={handleSaveGrade} 
                      disabled={isSaving}
                      className="flex-[2.5] h-16 rounded-[20px] bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-2xl shadow-primary/20 transition-all active:scale-95 group"
                    >
                       {isSaving ? (
                         <Loader2 className="h-6 w-6 animate-spin" />
                       ) : (
                         <div className="flex items-center gap-3">
                           <Save className="h-6 w-6 transition-transform group-hover:-translate-y-0.5" />
                           حفظ واعتماد النتيجة النهائية
                         </div>
                       )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsDetailOpen(false)} 
                      className="flex-1 h-16 rounded-[20px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
                    >
                      إلغاء
                    </Button>
                 </div>
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
