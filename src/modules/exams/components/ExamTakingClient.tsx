'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Send, PenTool, Home } from "lucide-react";
import { toArabicDigits } from "@/lib/utils";
import { toast } from "sonner";
import { submitExamAction } from "../actions";

interface Question {
  id: string;
  questionText: string;
  type: "MCQ" | "ESSAY" | "TRUE_FALSE";
  options: any; // array of strings for MCQ
  grade: number;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  duration: number; // minutes
  questions: Question[];
}

interface ExamTakingClientProps {
  exam: Exam;
  studentId: string;
}

export function ExamTakingClient({ exam, studentId }: ExamTakingClientProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinalSubmit(); // Auto-submit when time is up
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toArabicDigits(mins)}:${toArabicDigits(secs.toString().padStart(2, '0'))}`;
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting || isFinished) return;
    
    setIsSubmitting(true);
    try {
      const result = await submitExamAction(exam.id, studentId, answers);
      
      if (result.success) {
          setIsFinished(true);
          toast.success("تم تسليم الامتحان بنجاح!");
      } else {
          toast.error(result.error || "حدث خطأ أثناء تسليم الامتحان.");
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ في الاتصال بالسيرفر.");
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  const currentQuestion = exam.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / (exam.questions.length || 1)) * 100;
  const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;
  const isTimeLow = timeLeft < (exam.duration * 60 * 0.1); // 10% of time left

  if (exam.questions.length === 0) {
      return (
          <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center sm:p-6">
              <AlertCircle className="h-16 w-16 text-slate-300 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">لا توجد أسئلة في هذا الامتحان.</h2>
              <Button onClick={() => router.push("/student/exams")} className="mt-4">العودة</Button>
          </div>
      );
  }

  if (isFinished) {
      return (
          <div className="mx-auto my-6 flex min-h-[70vh] max-w-2xl flex-col items-center justify-center rounded-[24px] border border-slate-100 bg-white p-4 text-center shadow-xl animate-in fade-in zoom-in duration-500 dark:border-slate-800 dark:bg-slate-900 sm:my-12 sm:rounded-[32px] sm:p-6">
              <div className="h-24 w-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="h-12 w-12 text-emerald-600 animate-bounce" />
              </div>
              <h1 className="mb-4 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">تم التسليم بنجاح!</h1>
              <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
                  أحسنت صنعاً في إنهاء الاختبار. سيتم مراجعة إجاباتك ورصد الدرجات في أقرب وقت ممكن. يمكنك المتابعة في لوحة التحكم.
              </p>
              <Button 
                onClick={() => router.push("/student/exams")} 
                className="h-14 rounded-2xl px-6 text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition-all active:scale-95 sm:px-10 sm:text-lg"
              >
                  <Home className="ml-2 h-5 w-5" />
                  العودة للرئيسية
              </Button>
          </div>
      );
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-4xl space-y-5 px-3 py-4 pb-24 sm:space-y-8 sm:px-4 sm:py-8 sm:pb-32" dir="rtl">
      {/* Header Sticky */}
      <div className="sticky top-3 z-40 space-y-4 rounded-[18px] border border-slate-200/50 bg-white/80 p-3 shadow-sm backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/80 sm:top-4 sm:rounded-[24px] sm:p-4">
        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <PenTool className="h-5 w-5" />
                </div>
                <div>
                     <h2 className="font-bold text-slate-900 dark:text-white leading-none mb-1 text-sm md:text-base">{exam.title}</h2>
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">سؤال {toArabicDigits(currentQuestionIndex + 1)} من {toArabicDigits(exam.questions.length)}</p>
                </div>
            </div>

            <div className={`flex w-fit items-center gap-2 rounded-2xl border px-4 py-2 ${isTimeLow ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg font-black">{formatTime(timeLeft)}</span>
            </div>
        </div>
        <Progress value={progress} className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>

      {/* Question Area */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
          <Card className="overflow-hidden rounded-[24px] border-slate-200 shadow-xl dark:border-slate-800 sm:rounded-[32px]">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:p-8">
                  <Badge className="mb-4 bg-primary/10 text-primary border-none font-bold px-3 py-1 text-xs">
                       {currentQuestion.type === "MCQ" ? 'اختيار من متعدد' : currentQuestion.type === "TRUE_FALSE" ? 'صح أو خطأ' : 'سؤال مقالي'} — {toArabicDigits(currentQuestion.grade)} درجات
                  </Badge>
                  <CardTitle className="text-xl font-black leading-relaxed text-slate-900 dark:text-white sm:text-2xl">
                      {currentQuestion.questionText}
                  </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-8">
                  {currentQuestion.type === "MCQ" ? (
                      <div className="grid gap-4">
                          {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, idx) => {
                              const isSelected = answers[currentQuestion.id] === option;
                              return (
                                  <button
                                      key={idx}
                                      onClick={() => handleAnswer(currentQuestion.id, option)}
                                      className={`group flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all sm:gap-4 sm:p-5 ${
                                          isSelected 
                                          ? 'border-primary bg-primary/5 text-primary' 
                                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                                      }`}
                                  >
                                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                                      </div>
                                      <span className="text-base font-bold sm:text-lg">{option}</span>
                                  </button>
                              );
                          })}
                      </div>
                  ) : currentQuestion.type === "TRUE_FALSE" ? (
                      <div className="grid gap-4">
                          {[
                            { value: "true", label: "صح" },
                            { value: "false", label: "خطأ" },
                          ].map((option) => {
                              const isSelected = answers[currentQuestion.id] === option.value;
                              return (
                                  <button
                                      key={option.value}
                                      onClick={() => handleAnswer(currentQuestion.id, option.value)}
                                      className={`group flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all sm:gap-4 sm:p-5 ${
                                          isSelected 
                                          ? 'border-primary bg-primary/5 text-primary' 
                                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                                      }`}
                                  >
                                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                                      </div>
                                      <span className="text-base font-bold sm:text-lg">{option.label}</span>
                                  </button>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <Label className="text-slate-500 font-bold mb-2 block">اكتب إجابتك هنا بوضوح:</Label>
                          <Textarea 
                            placeholder="ابدأ الكتابة..."
                            className="min-h-[180px] rounded-[20px] border-slate-200 p-4 text-base font-bold focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 sm:min-h-[200px] sm:p-6 sm:text-xl"
                            value={answers[currentQuestion.id] || ""}
                            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                          />
                      </div>
                  )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:p-8">
                  <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      disabled={currentQuestionIndex === 0}
                      className="h-12 w-full rounded-xl border-slate-200 px-6 font-bold transition-all hover:bg-white active:scale-95 dark:border-slate-700 dark:hover:bg-slate-800 min-[420px]:w-auto"
                  >
                      السابق
                      <ChevronLeft className="mr-2 h-5 w-5" />
                  </Button>

                  {!isLastQuestion ? (
                      <Button
                          onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                          className="h-12 w-full rounded-xl bg-slate-100 px-6 font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-white dark:hover:bg-white/10 min-[420px]:w-auto"
                      >
                          التالي
                          <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                  ) : (
                      <Button
                          onClick={() => setShowConfirm(true)}
                          className="h-12 w-full rounded-xl bg-emerald-600 px-6 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95 dark:shadow-none min-[420px]:w-auto sm:px-8"
                      >
                          <Send className="ml-2 h-4 w-4" />
                          تسليم الاختبار
                      </Button>
                  )}
              </CardFooter>
          </Card>
      </div>

      {/* Confirmation Overlay */}
      {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
              <Card className="w-full max-w-md space-y-5 rounded-[24px] border-none p-5 shadow-2xl sm:space-y-6 sm:rounded-[30px] sm:p-8">
                  <div className="h-16 w-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                      <AlertCircle className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="text-center space-y-2">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">هل أنت متأكد من التسليم؟</h3>
                      <p className="text-slate-500 font-medium">بمجرد التسليم لن تتمكن من تعديل إجاباتك مرة أخرى.</p>
                  </div>
                  <div className="flex flex-col gap-3 min-[420px]:flex-row">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowConfirm(false)} 
                        className="flex-1 h-14 rounded-2xl font-bold border-slate-200 hover:bg-slate-50"
                      >
                          إلغاء
                      </Button>
                      <Button 
                        onClick={handleFinalSubmit} 
                        disabled={isSubmitting}
                        className="flex-1 h-14 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                      >
                          {isSubmitting ? "جاري التسليم..." : "نعم، متأكد"}
                      </Button>
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
}
