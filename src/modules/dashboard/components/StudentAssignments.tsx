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
import { showToast } from "@/components/ui/Toast"

interface StudentAssignment {
  id: string
  title: string
  dueDate: string | Date
  group: { name: string, subject?: string }
  status: "pending" | "submitted" | "graded" | "overdue"
  submission?: {
    grade?: number | null,
    fileUrl?: string | null,
    note?: string | null,
    aiFeedback?: string | null,
    gradedByAi?: boolean
  }
  maxGrade?: number
}

export function StudentAssignments({ initialAssignments = [] }: { initialAssignments?: StudentAssignment[] }) {
  const [assignments, setAssignments] = useState(initialAssignments)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [submissionNote, setSubmissionNote] = useState("")

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage
      .from("assignments")
      .upload(fileName, file)
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from("assignments")
      .getPublicUrl(fileName)
    
    return urlData.publicUrl
  }

  const pendingCount = assignments.filter(a => a.status === "pending" || a.status === "overdue").length

  const handleOpenSubmit = (assignment: StudentAssignment) => {
    setSelectedAssignment(assignment)
    setIsSubmitModalOpen(true)
    setSubmissionFile(null)
    setSubmissionNote("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!submissionFile) return;
    
    setIsSubmitting(true)
    try {
      const fileUrl = await uploadFile(submissionFile, "submissions")
      
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
      
      showToast.success("تم تسليم الواجب بنجاح")
      setIsSubmitModalOpen(false)
    } catch (error) {
      console.error("Submission failed:", error)
      showToast.error("فشل تسليم الواجب، يرجى المحاولة مرة أخرى")
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <h2 className="text-xl font-bold">واجباتي</h2>
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
          <p className="text-muted-foreground font-medium">لا توجد واجبات معلقة</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              تعليق المعلم (الذكاء الاصطناعي)
            </DialogTitle>
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

          <div className="pt-4 border-t mt-4">
            <Button onClick={() => setFeedbackModalOpen(false)} className="w-full">إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تسليم الواجب</DialogTitle>
          </DialogHeader>
          {selectedAssignment && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>الواجب</Label>
                <div className="mt-1 font-bold text-lg">{selectedAssignment.title}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">رفع الملف</Label>
                <Input 
                  id="file" 
                  type="file" 
                  required 
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">ملاحظة</Label>
                <Textarea 
                  id="note" 
                  placeholder="أضف ملاحظة للمدرس (اختياري)" 
                  rows={3} 
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Upload className="h-4 w-4 ml-2" />
                {isSubmitting ? "جاري الرفع والتسليم..." : "تأكيد التسليم"}
              </Button>
            </form>
          )}
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
    <Card className="overflow-hidden border-r-4 border-r-slate-200 transition-all hover:bg-muted/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{assignment.title}</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{assignment.group?.name || assignment.group?.subject}</p>
        </div>

        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <StatusBadge
              status={assignment.status}
              grade={assignment.submission?.grade}
              maxGrade={assignment.maxGrade || 100}
              gradedByAi={assignment.submission?.gradedByAi}
            />
            {(assignment.status === "pending" || assignment.status === "overdue") && (
              <div className={cn("flex items-center gap-1 text-[11px] font-bold", dueInfo.color)}>
                <dueInfo.icon className="h-3 w-3" />
                {dueInfo.label}
              </div>
            )}
          </div>

          {assignment.status === "graded" && assignment.submission?.aiFeedback && (
            <Button variant="outline" className="w-full text-xs h-9 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 font-bold gap-2" onClick={onViewFeedback}>
              <Sparkles className="h-3 w-3" />
              عرض ملاحظات المعلم الذكي
            </Button>
          )}
        </div>

        {(assignment.status === "pending" || assignment.status === "overdue") && (
          <Button variant="default" className="w-full mt-2 font-bold" onClick={onSubmit}>
            تسليم الواجب
          </Button>
        )}
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
