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
import { updateExamSubmissionAction, aiGradeExamAction } from "../actions";

interface ExamResultsClientProps {
  exam: {
    id: string;
    title: string;
    questions: {
      id: string;
      questionText: string;
      type: "MCQ" | "ESSAY";
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
              {filteredSubmissions.map((s) => (
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
                        {new Date(s.submittedAt).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                     </div>
                  </td>
                  <td className="p-4">
                     <div className="flex items-center gap-1">
                        <span className={`text-lg font-extrabold ${s.totalGrade !== null ? 'text-primary' : 'text-slate-300'}`}>
                           {s.totalGrade !== null ? toArabicDigits(s.totalGrade) : '--'}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">/ {toArabicDigits(exam.questions.reduce((a, b) => a + b.grade, 0))}</span>
                     </div>
                  </td>
                  <td className="p-4">
                      {s.totalGrade !== null ? (
                         <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400">تم التصحيح</Badge>
                      ) : (
                         <Badge variant="outline" className="text-slate-400 bg-slate-50 border-slate-200">بانتظار الرصد</Badge>
                      )}
                  </td>
                  <td className="p-4 text-left">
                    <Button variant="ghost" className="h-auto py-2 group-hover:bg-white shadow-sm rounded-lg" onClick={() => handleOpenDetail(s)}>
                      <Eye className="h-4 w-4 ml-1.5" />
                      عرض الإجابات
                    </Button>
                  </td>
                </tr>
              ))}
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col rounded-[24px]" dir="rtl">
          <DialogHeader className="p-6 border-b bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="h-6 w-6" />
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-extrabold">{selectedSubmission?.student.name}</DialogTitle>
                    <p className="text-sm text-slate-500 font-bold">مراجعة إجابات الطالب ورصد الدرجة</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <Button 
                   onClick={handleAiGrade} 
                   disabled={isAiGrading}
                   variant="outline" 
                   className="rounded-xl border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400 font-bold min-h-0 h-10 py-0"
                 >
                    {isAiGrading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Sparkles className="h-4 w-4 ml-2" />}
                    تصحيح بالـ AI
                 </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
            <div className="space-y-8">
              {exam.questions.map((question, index) => {
                const studentAnswer = selectedSubmission?.answers[question.id];

                return (
                  <div key={question.id} className="border border-slate-700 rounded-2xl p-5 space-y-4 bg-slate-900/50">
                    
                    {/* رأس السؤال */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-400">س {index + 1}</span>
                      <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                        {question.grade} درجة
                      </span>
                    </div>

                    {/* نص السؤال */}
                    <p className="text-base font-semibold text-white">{question.questionText}</p>

                    {/* MCQ — الخيارات في grid */}
                    {question.type === 'MCQ' && (
                      <div className="grid grid-cols-2 gap-2">
                        {Array.isArray(question.options) && question.options.map((opt, i) => (
                          <div key={i} className={`rounded-xl px-4 py-2 text-sm text-center border
                            ${opt === question.correctAnswer 
                              ? 'border-green-500 bg-green-950 text-green-300' 
                              : opt === studentAnswer 
                                ? 'border-red-500 bg-red-950 text-red-300'
                                : 'border-slate-700 bg-slate-800 text-slate-400'
                            }`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ESSAY — إجابة الطالب والنموذجية */}
                    {question.type === 'ESSAY' && (
                      <div className="space-y-2">
                        <div className="rounded-xl p-3 bg-slate-800 border border-slate-600">
                          <p className="text-xs text-slate-400 mb-1">إجابة الطالب</p>
                          <p className="text-sm text-white">{studentAnswer || "(بدون إجابة)"}</p>
                        </div>
                        <div className="rounded-xl p-3 bg-slate-800 border border-green-800">
                          <p className="text-xs text-green-400 mb-1">الإجابة النموذجية</p>
                          <p className="text-sm text-slate-300">{question.correctAnswer}</p>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-4">
              <div className="w-full space-y-4">
                 {selectedSubmission?.aiFeedback && (
                    <div className="p-3 bg-blue-950 border border-blue-700 rounded-xl mt-2 overflow-hidden">
                      <p className="text-xs text-blue-400 font-bold mb-1 flex items-center gap-2">
                        <Sparkles className="h-3 w-3" />
                        🤖 تقييم الذكاء الاصطناعي:
                      </p>
                      <p className="text-sm text-blue-200 leading-relaxed mb-2">{selectedSubmission.aiFeedback}</p>
                      <div className="flex items-center justify-between border-t border-blue-800/50 pt-2">
                         <p className="text-xs text-blue-400">الدرجة المقترحة: <span className="font-bold text-blue-200">{toArabicDigits(selectedSubmission.aiGrade || 0)}</span></p>
                      </div>
                    </div>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="col-span-1 space-y-2">
                       <label className="text-sm font-bold text-slate-600">الدرجة النهائية</label>
                       <Input 
                         type="number" 
                         value={localGrade ?? 0} 
                         onChange={(e) => setLocalGrade(parseInt(e.target.value) || 0)}
                         placeholder="0"
                         className="h-12 text-center text-xl font-extrabold text-primary bg-white rounded-xl dark:bg-slate-900"
                       />
                    </div>
                    <div className="col-span-3 space-y-2">
                       <label className="text-sm font-bold text-slate-600">تعليق المعلم (اختياري)</label>
                       <Input 
                         value={localComment || ""}
                         onChange={(e) => setLocalComment(e.target.value)}
                         placeholder="اكتب ملاحظاتك للطالب هنا..."
                         className="h-12 bg-white rounded-xl dark:bg-slate-900"
                       />
                    </div>
                 </div>
                <div className="flex gap-3">
                   <Button 
                     onClick={handleSaveGrade} 
                     disabled={isSaving}
                     className="flex-1 h-14 rounded-2xl bg-primary text-white font-extrabold text-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                   >
                      {isSaving ? <Loader2 className="h-5 w-5 animate-spin ml-2" /> : <Save className="h-5 w-5 ml-2" />}
                      حفظ واعتماد النتيجة
                   </Button>
                   <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="h-14 px-8 rounded-2xl font-bold">إلغاء</Button>
                </div>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
