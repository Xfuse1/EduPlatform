"use client"

import React, { useState } from "react"
import { BookOpen, CheckCircle2, Clock, AlertCircle, Upload, X, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { buildStorageFilePath } from "@/lib/storage-file-name"
import { showToast } from "@/components/ui/Toast"
import { useSession } from "@/modules/auth/hooks/useSession"

interface StudentAssignment {
  id: string
  title: string
  dueDate: string | Date
  fileUrl?: string | null
  fileLink?: string | null
  group: { name: string, subject?: string }
  status: "pending" | "submitted" | "graded" | "overdue"
  submission?: {
    grade?: number | null,
    fileUrl?: string | null,
    note?: string | null,
    aiFeedback?: string | null,
    teacherComment?: string | null,
    gradedByAi?: boolean
  }
  maxGrade?: number
}

type StudentAssignmentsProps = {
  initialAssignments?: StudentAssignment[]
  title?: string
  emptyMessage?: string
}

export function StudentAssignments({
  initialAssignments = [],
  title = "واجباتي",
  emptyMessage = "لا توجد واجبات معلقة",
}: StudentAssignmentsProps) {
  const { data: session } = useSession()
  const [assignments, setAssignments] = useState(initialAssignments)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [submissionNote, setSubmissionNote] = useState("")
  const [submissionFileName, setSubmissionFileName] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (file: File | null) => {
    if (file) {
      setSubmissionFile(file)
      setSubmissionFileName(file.name)
    } else {
      setSubmissionFile(null)
      setSubmissionFileName("")
    }
  }

  const uploadFile = async (file: File, filePath: string) => {
    const { data, error } = await supabase.storage
      .from("assignments")
      .upload(filePath, file)
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from("assignments")
      .getPublicUrl(filePath)
    
    return urlData.publicUrl
  }

  const pendingCount = assignments.filter(a => a.status === "pending" || a.status === "overdue").length

  const handleOpenSubmit = (assignment: StudentAssignment) => {
    setSelectedAssignment(assignment)
    setIsSubmitModalOpen(true)
    setSubmissionFile(null)
    setSubmissionFileName("")
    setSubmissionNote(assignment.submission?.note || "")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!submissionFile || !selectedAssignment) return;
    if (!session?.user.name) {
      showToast.error("تعذر تحديد اسم الطالب الآن. يرجى إعادة المحاولة.")
      return
    }
    
    setIsSubmitting(true)
    try {
      const fileUrl = await uploadFile(
        submissionFile,
        buildStorageFilePath({
          folder: "submissions",
          file: submissionFile,
          parts: [selectedAssignment.title, session.user.name],
        }),
      )
      
      const response = await fetch(`/api/assignments/${selectedAssignment?.id}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileUrl,
          note: submissionNote
        })
      });

      if (!response.ok) {
        throw new Error("Failed to submit assignment");
      }

      const { submission } = await response.json();
      
      setAssignments(assignments.map(a => a.id === selectedAssignment?.id ? { 
        ...a, 
        status: "submitted", 
        submission: submission 
      } : a))
      
      showToast.success(selectedAssignment?.status === "submitted" ? "تم تحديث الواجب بنجاح" : "تم تسليم الواجب بنجاح")
      setIsSubmitModalOpen(false)
    } catch (error) {
      console.error("Submission failed:", error)
      showToast.error("فشل تسليم الواجب، يرجى المحاولة مرة أخرى")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteFile = async () => {
    if (!confirm("هل تريد حذف الملف المرفوع؟")) return;
    
    try {
      const res = await fetch(`/api/assignments/${selectedAssignment?.id}/submissions`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        // تحديث الواجهة
        const updatedAssignments = assignments.map(a => 
          a.id === selectedAssignment?.id 
            ? { ...a, status: "pending" as const, submission: { ...a.submission, fileUrl: null } } 
            : a
        );
        setAssignments(updatedAssignments);
        setSelectedAssignment(prev => prev ? {
          ...prev,
          status: "pending",
          submission: { ...prev.submission, fileUrl: null }
        } : null);
        showToast.success("تم حذف الملف بنجاح")
      } else {
        throw new Error("Failed to delete file")
      }
    } catch (error) {
      console.error("Delete failed:", error)
      showToast.error("فشل حذف الملف")
    }
  };

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [currentFeedback, setCurrentFeedback] = useState<any>(null)

  const handleOpenFeedback = (assignment: StudentAssignment) => {
    if (assignment.submission?.aiFeedback) {
      try {
        const parsed = JSON.parse(assignment.submission.aiFeedback)
        setCurrentFeedback(parsed)
        setFeedbackModalOpen(true)
      } catch (e) {
        setCurrentFeedback(assignment.submission.aiFeedback)
        setFeedbackModalOpen(true)
      }
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{title}</h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="rounded-full px-2 py-0 h-5 min-w-[20px] justify-center">
              {pendingCount}
            </Badge>
          )}
        </div>
      </div>

      {assignments.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center bg-muted/20">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-muted-foreground font-medium">{emptyMessage}</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onSubmit={() => handleOpenSubmit(assignment)}
              onViewFeedback={() => handleOpenFeedback(assignment)}
            />
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] p-0 overflow-hidden border-none" dir="rtl">
          <div className="bg-gradient-to-br from-purple-50 via-background to-background dark:from-purple-900/10 dark:via-slate-950 dark:to-slate-950 p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                    تقرير التصحيح الذكي
                    <Badge className="bg-purple-500 hover:bg-purple-600">AI ✨</Badge>
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-1">تفاصيل وملاحظات شاملة على إجاباتك</p>
                </div>
              </div>
            </DialogHeader>

          {currentFeedback && (
            <div className="space-y-6 overflow-y-auto max-h-[70vh] p-2">
              {typeof currentFeedback === 'string' ? (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  {currentFeedback}
                </p>
              ) : (
                <>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-2xl border border-purple-100 dark:border-purple-800/50">
                    <h4 className="font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      التقييم العام
                    </h4>
                    <p className="text-sm text-purple-800 dark:text-purple-400 leading-relaxed">
                      {currentFeedback.summary}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-500">تفاصيل الإجابات</h4>
                    {currentFeedback.feedback?.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-start gap-4">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">
                          {item.question}
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-bold">{item.comment}</p>
                            <Badge variant={item.score > 70 ? "success" : "warning"} className="text-[10px] h-5">
                              {item.score} درجة
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button onClick={() => setFeedbackModalOpen(false)} variant="outline" className="px-8 rounded-xl font-bold bg-white dark:bg-slate-900">إغلاق التقرير</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none" dir="rtl">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {selectedAssignment?.status === "submitted" ? "تعديل تسليم الواجب" : "تسليم الواجب"}
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedAssignment?.status === "submitted" ? "يمكنك تحديث ملف الحل أو الملاحظات" : "قم برفع الحل الخاص بك ليتمكن المعلم من تصحيحه"}
                  </p>
                </div>
              </div>
            </DialogHeader>

            {selectedAssignment && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {selectedAssignment.submission?.fileUrl && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium">ملف مرفوع بالفعل</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={selectedAssignment.submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        عرض الملف
                      </a>
                      <button
                        type="button"
                        onClick={handleDeleteFile}
                        className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-lg transition-colors"
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
                  <Label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">الواجب المختار</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-white font-bold">
                      {selectedAssignment.group.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{selectedAssignment.title}</div>
                      <div className="text-xs text-slate-500">{selectedAssignment.group.name}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold mb-1 block">ملف الحل</Label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                    className={cn(
                      "group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8",
                      isDragging 
                        ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50",
                      submissionFile && "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                    )}
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      required={!submissionFile}
                    />
                    
                    {submissionFile ? (
                      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white max-w-[250px] truncate">{submissionFileName}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">تم اختيار الملف بنجاح</p>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="mt-4 h-8 text-xs text-slate-400 hover:text-destructive transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileChange(null);
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          تغيير الملف
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                          <Upload className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">اسحب الملف هنا أو انقر للإختيار</p>
                        <p className="text-xs text-slate-400 mt-2 font-medium">يدعم جميع أنواع الملفات (الحد الأقصى 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note" className="text-slate-700 dark:text-slate-300 font-bold block">ملاحظات إضافية</Label>
                  <Textarea 
                    id="note" 
                    placeholder="هل تود إخبار المعلم بشيء عن هذا الواجب؟" 
                    className="min-h-[100px] bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl transition-all focus:ring-primary/20"
                    value={submissionNote}
                    onChange={(e) => setSubmissionNote(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none" 
                    disabled={isSubmitting || !submissionFile}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2" />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 ml-2" />
                        {selectedAssignment.status === "submitted" ? "تحديث التسليم" : "تأكيد وإرسال الواجب"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AssignmentCard({ assignment, onSubmit, onViewFeedback }: { assignment: StudentAssignment, onSubmit: () => void, onViewFeedback: () => void }) {
  const getDueStatus = (dateStr: string | Date) => {
    const dueDate = new Date(dateStr)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: "منتهي", color: "text-destructive", icon: AlertCircle }
    if (diffDays < 3) return { label: `يستحق خلال ${diffDays} أيام`, color: "text-red-500", icon: Clock }
    if (diffDays <= 7) return { label: `يستحق خلال ${diffDays} أيام`, color: "text-yellow-600", icon: Clock }
    return { label: `يستحق خلال ${diffDays} أيام`, color: "text-emerald-600", icon: Clock }
  }

  const dueInfo = getDueStatus(assignment.dueDate)

  return (
    <Card className="group relative overflow-hidden border-none bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Visual Accent */}
      <div className={cn(
        "absolute top-0 right-0 w-1.5 h-full",
        assignment.status === "pending" ? "bg-amber-400" : 
        assignment.status === "submitted" ? "bg-emerald-400" :
        assignment.status === "graded" ? "bg-primary" : 
        "bg-destructive"
      )} />
      
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight text-lg group-hover:text-primary transition-colors">
              {assignment.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <div className="h-5 w-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <BookOpen className="h-3 w-3" />
            </div>
            <span className="text-xs uppercase tracking-wide">{assignment.group?.name || assignment.group?.subject}</span>
          </div>
        </div>

        {(assignment.fileUrl || assignment.fileLink) && (
          <a
            href={assignment.fileUrl || assignment.fileLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50/50 dark:bg-sky-950/30 dark:border-sky-900/50 p-2.5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-all group/link"
          >
            <Upload className="h-3.5 w-3.5 group-hover/link:translate-y-[-1px] transition-transform" />
            عرض ملف المتطلبات
          </a>
        )}

        <div className="flex flex-col space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <StatusBadge
              status={assignment.status}
              grade={assignment.submission?.grade}
              maxGrade={assignment.maxGrade || 100}
              gradedByAi={assignment.submission?.gradedByAi}
            />
            {(assignment.status === "pending" || assignment.status === "overdue") && (
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold shadow-sm", dueInfo.color)}>
                <dueInfo.icon className="h-3 w-3" />
                {dueInfo.label}
              </div>
            )}
          </div>

          {assignment.status === "graded" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
              {/* تعليق المعلم */}
              {assignment.submission?.teacherComment && (
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-200 dark:text-emerald-800" />
                   </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    تعليق المعلم:
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{assignment.submission?.teacherComment}</p>
                </div>
              )}

              {/* تعليق الذكاء الاصطناعي */}
              {assignment.submission?.aiFeedback && (
                <Button 
                  variant="outline" 
                  className="w-full text-xs h-10 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-100 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 dark:text-purple-300 dark:border-purple-800 font-bold gap-2 rounded-xl shadow-sm transition-all active:scale-95" 
                  onClick={onViewFeedback}
                >
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  تقرير التصحيح الذكي ✨
                </Button>
              )}
            </div>
          )}

          {(assignment.status === "pending" || assignment.status === "overdue") && (
            <Button 
              variant="default" 
              className="w-full h-11 font-bold rounded-xl shadow-lg shadow-primary/10 transition-all hover:shadow-primary/20 active:scale-[0.98]" 
              onClick={onSubmit}
            >
              <Upload className="h-4 w-4 ml-2" />
              تسليم الواجب الآن
            </Button>
          )}

          {assignment.status === "submitted" && (
            <Button 
              variant="outline" 
              className="w-full h-11 font-bold rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all active:scale-[0.98]" 
              onClick={onSubmit}
            >
              <X className="h-4 w-4 ml-2 rotate-45" />
              تعديل الحل المسلم
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status, grade, maxGrade, gradedByAi }: { status: StudentAssignment["status"], grade?: number | null, maxGrade?: number, gradedByAi?: boolean }) {
  switch (status) {
    case "graded":
      const gradeColor = (grade || 0) >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
        : (grade || 0) >= 50 ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300"
          : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300";

      return (
        <div className="flex flex-col">
          <Badge variant="outline" className={cn("gap-1 font-black", gradeColor)}>
            {gradedByAi && <Sparkles className="h-3 w-3" />}
            {grade} / {maxGrade}
          </Badge>
          <span className="text-[10px] font-bold mt-1 text-slate-400 text-center">
            تم التصحيح {gradedByAi ? "آلياً" : "يدوياً"}
          </span>
        </div>
      )
    case "submitted":
      return (
        <Badge variant="success" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          مُسلَّم
        </Badge>
      )
    case "overdue":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          متأخر
        </Badge>
      )
    case "pending":
    default:
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          لم يُسلَّم
        </Badge>
      )
  }
}
