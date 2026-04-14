"use client";

import { Check, ExternalLink, FileText, Loader2, X, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchSubmissions, gradeSubmission } from "../actions";
import { showToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/badge";
import { AIGradingModal } from "./AIGradingModal";

interface AssignmentSubmissionsModalProps {
    assignmentId: string | null;
    onClose: () => void;
}

export function AssignmentSubmissionsModal({ assignmentId, onClose }: AssignmentSubmissionsModalProps) {
    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [gradingId, setGradingId] = useState<string | null>(null);
    const [gradeValue, setGradeValue] = useState<string>("");
    const [teacherComment, setTeacherComment] = useState<string>("");
    const [aiGradingSub, setAiGradingSub] = useState<any>(null);

    useEffect(() => {
        if (!assignmentId) return;
        
        const load = async () => {
            setLoading(true);
            const data = await fetchSubmissions(assignmentId);
            setAssignment(data);
            setLoading(false);
        };
        load();
    }, [assignmentId]);

    const handleSaveGrade = async (submissionId: string) => {
        const numGrade = parseInt(gradeValue);
        if (isNaN(numGrade) || numGrade < 0) {
            showToast.error("الرجاء إدخال درجة صالحة");
            return;
        }

        const res = await gradeSubmission(submissionId, numGrade, undefined, teacherComment);
        if (res.success) {
            showToast.success("تم التحديث بنجاح");
            
            // update local state
            setAssignment((prev: any) => ({
                ...prev,
                submissions: prev.submissions.map((sub: any) => 
                    sub.id === submissionId ? { ...sub, grade: numGrade, teacherComment } : sub
                )
            }));
            
            setGradingId(null);
            setGradeValue("");
            setTeacherComment("");
        } else {
            showToast.error("حدث خطأ أثناء التحديث");
        }
    };

    const handleAIGraded = async (grade: number, feedback: string) => {
        if (!aiGradingSub) return;
        
        const res = await gradeSubmission(aiGradingSub.id, grade, {
            aiGrade: grade,
            aiFeedback: feedback,
            gradedByAi: true
        });

        if (res.success) {
            showToast.success("تم اعتماد تصحيح الذكاء الاصطناعي");
            setAssignment((prev: any) => ({
                ...prev,
                submissions: prev.submissions.map((sub: any) => 
                    sub.id === aiGradingSub.id ? { ...sub, grade, gradedByAi: true, aiGrade: grade, aiFeedback: feedback } : sub
                )
            }));
        } else {
            showToast.error("حدث خطأ أثناء حفظ نتيجة الذكاء الاصطناعي");
        }
        setAiGradingSub(null);
    };

    return (
        <Dialog open={!!assignmentId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                    <DialogTitle>{loading ? "جاري التحميل..." : assignment?.title ? `تسليمات: ${assignment.title}` : "تفاصيل التسليمات"}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : assignment && assignment.submissions.length > 0 ? (
                        <div className="space-y-4">
                            {assignment.submissions.map((sub: any) => (
                                <div key={sub.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">{sub.student.name}</h4>
                                        <p className="text-xs text-slate-500 font-bold mb-2">{sub.student.phone}</p>
                                        
                                        {sub.note && (
                                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 inline-block mb-2">
                                                <span className="font-bold text-slate-400 text-xs ml-1">ملاحظة:</span> 
                                                {sub.note}
                                            </p>
                                        )}
                                        {(sub.fileUrl || assignment?.fileUrl) && (
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                {sub.fileUrl && (
                                                    <a
                                                        href={sub.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-extrabold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-100 hover:text-sky-800 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-900/60 dark:hover:text-white"
                                                    >
                                                        <ExternalLink className="h-4 w-4 shrink-0" />
                                                        عرض إجابات الطالب
                                                    </a>
                                                )}

                                                {assignment?.fileUrl && (
                                                    <a
                                                        href={assignment.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-extrabold text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/50 dark:hover:text-white"
                                                    >
                                                        <FileText className="h-4 w-4 shrink-0" />
                                                        عرض ملف الأسئلة
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {sub.teacherComment && (
                                            <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/50 inline-block">
                                                <span className="font-bold text-emerald-400 text-xs ml-1">تعليق المعلم:</span>
                                                {sub.teacherComment}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                            {gradingId === sub.id ? (
                                                <div className="flex flex-col gap-2 items-end">
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            type="number" 
                                                            className="w-20 text-center font-bold" 
                                                            placeholder="الدرجة"
                                                            value={gradeValue}
                                                            onChange={(e) => setGradeValue(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <Button className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 !p-0" onClick={() => handleSaveGrade(sub.id)}>
                                                            <Check className="h-4 w-4 text-white" />
                                                        </Button>
                                                        <Button variant="outline" className="h-9 w-9 text-slate-400 hover:text-slate-600 !p-0" onClick={() => setGradingId(null)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <Input 
                                                        className="w-full text-xs font-medium" 
                                                        placeholder="أضف تعليقاً للمعلم..."
                                                        value={teacherComment}
                                                        onChange={(e) => setTeacherComment(e.target.value)}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    {sub.grade !== null ? (
                                                        <div className="flex items-center gap-2">
                                                            {sub.gradedByAi && (
                                                                <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                                    <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                                                </div>
                                                            )}
                                                            <Badge variant={sub.grade >= 70 ? "success" : sub.grade >= 50 ? "warning" : "destructive"} className="font-bold cursor-pointer" onClick={() => {
                                                                setGradeValue(sub.grade.toString());
                                                                setTeacherComment(sub.teacherComment || "");
                                                                setGradingId(sub.id);
                                                            }}>
                                                                {sub.grade} درجة
                                                            </Badge>
                                                        </div>
                                                    ) : (
                                                        <Button variant="outline" className="font-bold text-xs h-8 px-3" onClick={() => {
                                                            setGradeValue("");
                                                            setTeacherComment(sub.teacherComment || "");
                                                            setGradingId(sub.id);
                                                        }}>
                                                            إضافة درجة
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        
                                        {assignment?.answerKeyUrl && (
                                            <Button 
                                                variant="outline" 
                                                className="h-8 px-3 text-[10px] bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 gap-1 font-bold"
                                                onClick={() => setAiGradingSub(sub)}
                                            >
                                                <Sparkles className="h-3 w-3" />
                                                تصحيح ذكي
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : assignment && assignment.submissions.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-slate-500 font-bold">لم يقم أي طالب بتسليم هذا الواجب حتى الآن.</p>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
            
            {aiGradingSub && (
                <AIGradingModal 
                    isOpen={!!aiGradingSub}
                    onClose={() => setAiGradingSub(null)}
                    assignment={assignment}
                    submission={aiGradingSub}
                    onGraded={handleAIGraded}
                />
            )}
        </Dialog>
    );
}
