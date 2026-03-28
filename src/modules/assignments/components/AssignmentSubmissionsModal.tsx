"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchSubmissions, gradeSubmission } from "../actions";
import { showToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/badge";

interface AssignmentSubmissionsModalProps {
    assignmentId: string | null;
    onClose: () => void;
}

export function AssignmentSubmissionsModal({ assignmentId, onClose }: AssignmentSubmissionsModalProps) {
    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [gradingId, setGradingId] = useState<string | null>(null);
    const [gradeValue, setGradeValue] = useState<string>("");

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

        const res = await gradeSubmission(submissionId, numGrade);
        if (res.success) {
            showToast.success("تم تحديث الدرجة بنجاح");
            
            // update local state
            setAssignment((prev: any) => ({
                ...prev,
                submissions: prev.submissions.map((sub: any) => 
                    sub.id === submissionId ? { ...sub, grade: numGrade } : sub
                )
            }));
            
            setGradingId(null);
            setGradeValue("");
        } else {
            showToast.error("حدث خطأ أثناء تحديث الدرجة");
        }
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
                                        {/* File url mockup since it's just a string */}
                                        {sub.fileUrl && (
                                            <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline font-bold">
                                                عرض المرفق
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shrink-0">
                                        {gradingId === sub.id ? (
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="w-20 text-center font-bold" 
                                                    placeholder="الدرجة"
                                                    value={gradeValue}
                                                    onChange={(e) => setGradeValue(e.target.value)}
                                                    autoFocus
                                                />
                                                <Button className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 text-white p-0" onClick={() => handleSaveGrade(sub.id)}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" className="h-9 w-9 text-slate-400 hover:text-slate-600 p-0" onClick={() => setGradingId(null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                {sub.grade !== null ? (
                                                    <Badge variant="success" className="font-bold cursor-pointer hover:bg-emerald-200" onClick={() => {
                                                        setGradeValue(sub.grade.toString());
                                                        setGradingId(sub.id);
                                                    }}>
                                                        {sub.grade} درجة
                                                    </Badge>
                                                ) : (
                                                    <Button variant="outline" className="font-bold text-xs h-8 px-3" onClick={() => {
                                                        setGradeValue("");
                                                        setGradingId(sub.id);
                                                    }}>
                                                        إضافة درجة
                                                    </Button>
                                                )}
                                            </>
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
        </Dialog>
    );
}
