"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/Toast";

interface AIGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  submission: any;
  onGraded: (grade: number, feedback: string) => void;
}

export function AIGradingModal({
  isOpen,
  onClose,
  assignment,
  submission,
  onGraded,
}: AIGradingModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !result && !loading) {
      handleStartGrading();
    }
  }, [isOpen]);

  const handleStartGrading = async () => {
    setLoading(true);
    setError(null);
    try {
      // استدعاء API التصحيح الآلي الجديد
      const response = await fetch("/api/ai-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentFileUrl: assignment.fileUrl,
          answerKeyUrl: assignment.answerKeyUrl,
          submissionFileUrl: submission.fileUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("AI Grading failed. Response from server:", errorData);
        throw new Error(errorData.error || "فشل التصحيح");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error("AI Grading Error:", err);
      setError(err.message || "حدث خطأ غير متوقع");
      showToast.error("فشل التصحيح الآلي");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onGraded(result.grade, result.summary);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>تصحيح ذكي (Gemini AI)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
                <Sparkles className="absolute top-0 right-0 h-4 w-4 text-purple-400 animate-pulse" />
              </div>
              <p className="text-slate-500 font-bold animate-pulse">جاري تحليل الإجابات وتصحيحها...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-rose-500" />
              <p className="text-rose-500 font-bold">{error}</p>
              <Button variant="outline" onClick={handleStartGrading}>إعادة المحاولة</Button>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white dark:bg-purple-800 flex items-center justify-center border-2 border-purple-200 shadow-sm">
                    <span className="text-xl font-black text-purple-700 dark:text-purple-300">{result.grade}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-900 dark:text-purple-100">الدرجة النهائية المقترحة</h3>
                    <p className="text-xs text-purple-600 dark:text-purple-400">من 100 درجة</p>
                  </div>
                </div>
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-300">تفاصيل التقييم:</h4>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="space-y-4">
                    {result.feedback && result.feedback.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-400">سؤال {item.question}</span>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{item.score} درجة</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-bold">{item.comment}</p>
                      </div>
                    ))}
                    
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <h5 className="text-xs font-black text-slate-400 mb-1">ملخص عام:</h5>
                      <p className="text-sm text-slate-800 dark:text-slate-200 italic font-bold">"{result.summary}"</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold" onClick={handleApply}>
                  اعتماد الدرجة والتعليق
                </Button>
                <Button variant="outline" className="flex-1 font-bold" onClick={onClose}>
                  إغلاق
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
