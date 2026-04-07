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
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
              <AlertCircle className="h-16 w-16 text-slate-300 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">لا توجد أسئلة في هذا الامتحان.</h2>
              <Button onClick={() => router.push("/student/exams")} className="mt-4">العودة</Button>
          </div>
      );
  }

  if (isFinished) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl max-w-2xl mx-auto my-12 animate-in fade-in zoom-in duration-500">
              <div className="h-24 w-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="h-12 w-12 text-emerald-600 animate-bounce" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">تم التسليم بنجاح!</h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
                  أحسنت صنعاً في إنهاء الاختبار. سيتم مراجعة إجاباتك ورصد الدرجات في أقرب وقت ممكن. يمكنك المتابعة في لوحة التحكم.
              </p>
              <Button 
                onClick={() => router.push("/student/exams")} 
                className="rounded-2xl h-14 px-10 text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition-all active:scale-95"
              >
                  <Home className="ml-2 h-5 w-5" />
                  العودة للرئيسية
              </Button>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 min-h-screen pb-32" dir="rtl">
      {/* Header Sticky */}
      <div className="sticky top-4 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[24px] border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <PenTool className="h-5 w-5" />
                </div>
                <div>
                     <h2 className="font-bold text-slate-900 dark:text-white leading-none mb-1 text-sm md:text-base">{exam.title}</h2>
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">سؤال {toArabicDigits(currentQuestionIndex + 1)} من {toArabicDigits(exam.questions.length)}</p>
                </div>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${isTimeLow ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg font-black">{formatTime(timeLeft)}</span>
            </div>
        </div>
        <Progress value={progress} className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>

      {/* Question Area */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
          <Card className="rounded-[32px] border-slate-200 shadow-xl overflow-hidden dark:border-slate-800">
              <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <Badge className="mb-4 bg-primary/10 text-primary border-none font-bold px-3 py-1 text-xs">
                       {currentQuestion.type === "MCQ" ? 'اختيار من متعدد' : currentQuestion.type === "TRUE_FALSE" ? 'صح أو خطأ' : 'سؤال مقالي'} — {toArabicDigits(currentQuestion.grade)} درجات
                  </Badge>
                  <CardTitle className="text-2xl font-black text-slate-900 dark:text-white leading-relaxed">
                      {currentQuestion.questionText}
                  </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                  {currentQuestion.type === "MCQ" ? (
                      <div className="grid gap-4">
                          {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, idx) => {
                              const isSelected = answers[currentQuestion.id] === option;
                              return (
                                  <button
                                      key={idx}
                                      onClick={() => handleAnswer(currentQuestion.id, option)}
                                      className={`flex items-center text-right gap-4 p-5 rounded-2xl border-2 transition-all group ${
                                          isSelected 
                                          ? 'border-primary bg-primary/5 text-primary' 
                                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                                      }`}
                                  >
                                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                                      </div>
                                      <span className="text-lg font-bold">{option}</span>
                                  </button>
                              );
                          })}
                      </div>
                  ) : currentQuestion.type === "TRUE_FALSE" ? (
                      <div className="grid gap-4">
                          {["صح", "خطأ"].map((option) => {
                              const isSelected = answers[currentQuestion.id] === option;
                              return (
                                  <button
                                      key={option}
                                      onClick={() => handleAnswer(currentQuestion.id, option)}
                                      className={`flex items-center text-right gap-4 p-5 rounded-2xl border-2 transition-all group ${
                                          isSelected 
                                          ? 'border-primary bg-primary/5 text-primary' 
                                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                                      }`}
                                  >
                                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                                      </div>
                                      <span className="text-lg font-bold">{option}</span>
                                  </button>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <Label className="text-slate-500 font-bold mb-2 block">اكتب إجابتك هنا بوضوح:</Label>
                          <Textarea 
                            placeholder="ابدأ الكتابة..."
                            className="min-h-[200px] rounded-[20px] border-slate-200 focus:ring-primary focus:border-primary text-xl font-bold p-6 dark:bg-slate-800 dark:border-slate-700"
                            value={answers[currentQuestion.id] || ""}
                            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                          />
                      </div>
                  )}
              </CardContent>
              <CardFooter className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      disabled={currentQuestionIndex === 0}
                      className="rounded-xl h-12 font-bold px-6 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95"
                  >
                      السابق
                      <ChevronLeft className="mr-2 h-5 w-5" />
                  </Button>

                  {!isLastQuestion ? (
                      <Button
                          onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                          className="rounded-xl h-12 font-bold px-6 bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white dark:hover:bg-white/10 shadow-sm transition-all active:scale-95"
                      >
                          التالي
                          <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                  ) : (
                      <Button
                          onClick={() => setShowConfirm(true)}
                          className="rounded-xl h-12 font-bold px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
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
              <Card className="max-w-md w-full rounded-[30px] border-none shadow-2xl p-8 space-y-6">
                  <div className="h-16 w-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                      <AlertCircle className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="text-center space-y-2">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">هل أنت متأكد من التسليم؟</h3>
                      <p className="text-slate-500 font-medium">بمجرد التسليم لن تتمكن من تعديل إجاباتك مرة أخرى.</p>
                  </div>
                  <div className="flex gap-3">
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
