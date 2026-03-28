"use client"

import React, { useState } from "react"
import { BookOpen, CheckCircle2, Clock, AlertCircle, Upload, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  submission?: { grade?: number | null, fileUrl?: string | null, note?: string | null }
  maxGrade?: number
}

export function StudentAssignments({ initialAssignments = [] }: { initialAssignments?: StudentAssignment[] }) {
  const [assignments, setAssignments] = useState(initialAssignments)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null)

  const pendingCount = assignments.filter(a => a.status === "pending" || a.status === "overdue").length

  const handleOpenSubmit = (assignment: StudentAssignment) => {
    setSelectedAssignment(assignment)
    setIsSubmitModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Mocking submission
    showToast.success("تم تسليم الواجب بنجاح")
    setAssignments(assignments.map(a => a.id === selectedAssignment?.id ? { ...a, status: "submitted", submission: { note: "تم التسليم" } } : a))
    setIsSubmitModalOpen(false)
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
            />
          ))}
        </div>
      )}

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
                <Input id="file" type="file" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">ملاحظة</Label>
                <Textarea id="note" placeholder="أضف ملاحظة للمدرس (اختياري)" rows={3} />
              </div>
              <Button type="submit" className="w-full">
                <Upload className="h-4 w-4 ml-2" />
                تأكيد التسليم
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AssignmentCard({ assignment, onSubmit }: { assignment: StudentAssignment, onSubmit: () => void }) {
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

        <div className="flex items-center justify-between">
          <StatusBadge 
            status={assignment.status} 
            grade={assignment.submission?.grade} 
            maxGrade={assignment.maxGrade || 20} 
          />
          {(assignment.status === "pending" || assignment.status === "overdue") && (
            <div className={cn("flex items-center gap-1 text-[11px] font-bold", dueInfo.color)}>
              <dueInfo.icon className="h-3 w-3" />
              {dueInfo.label}
            </div>
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

function StatusBadge({ status, grade, maxGrade }: { status: StudentAssignment["status"], grade?: number | null, maxGrade?: number }) {
  switch (status) {
    case "graded":
      return (
        <div className="flex flex-col">
          <Badge variant="info" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300">
            <CheckCircle2 className="h-3 w-3" />
            تم التصحيح
          </Badge>
          <span className="text-sm font-bold mt-1 text-blue-700 dark:text-blue-400">
            {grade} / {maxGrade}
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
