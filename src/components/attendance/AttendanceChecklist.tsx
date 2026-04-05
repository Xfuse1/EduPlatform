"use client"

import React, { useState, useMemo } from "react"
import { Check, X, Clock, Save, MoreHorizontal, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { getInitials, toArabicDigits, cn } from "@/lib/utils"
import { showToast } from "@/components/ui/Toast"

// --- Types ---

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "NONE"

interface Student {
  id: string
  name: string
  avatar?: string
}

// --- Mock Data ---

const MOCK_STUDENTS: Student[] = [
  { id: "s1", name: "أحمد بن محمد الحلواني" },
  { id: "s2", name: "سارة محمود علي" },
  { id: "s3", name: "محمود حسن" },
  { id: "s4", name: "ليلى أحمد" },
  { id: "s5", name: "زياد خالد" },
  { id: "s6", name: "هند سعيد" },
  { id: "s7", name: "عمر فاروق" },
  { id: "s8", name: "نورين ياسر" },
]

export function AttendanceChecklist({ groupName = "المجموعة أ", studentList = MOCK_STUDENTS }: { groupName?: string, studentList?: Student[] }) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [isSaving, setIsSaving] = useState(false)

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
  }

  const recordedCount = Object.keys(attendance).length
  const totalCount = studentList.length
  const progressValue = (recordedCount / totalCount) * 100
  const isFinished = recordedCount === totalCount

  const handleSave = () => {
    setIsSaving(true)
    // TODO: implement API call to save attendance
    setTimeout(() => {
      setIsSaving(false)
      showToast.success("تم حفظ سجل الحضور بنجاح")
    }, 1500)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl border-none overflow-hidden rounded-[32px] bg-slate-50 dark:bg-slate-900" dir="rtl">
      <CardHeader className="bg-white dark:bg-slate-950 p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-black">تسجيل الحضور اليدوي</CardTitle>
            <p className="text-sm text-slate-500 font-bold mt-1">المجموعة: {groupName}</p>
          </div>
          <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-black tracking-widest bg-slate-100 dark:bg-slate-900 border-none tabular-nums">
            {toArabicDigits(recordedCount)} من {toArabicDigits(totalCount)}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
            <span>نسبة الإنجاز</span>
            <span>{toArabicDigits(Math.round(progressValue))}%</span>
          </div>
          <Progress value={progressValue} className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {studentList.map((student) => {
            const status = attendance[student.id] || "NONE"
            return (
              <div 
                key={student.id} 
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 rounded-[20px] border border-slate-100 dark:border-slate-800 transition-all hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs">
                    {getInitials(student.name)}
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">{student.name}</span>
                </div>

                <div className="flex gap-2">
                  <AttendanceButton 
                    status="PRESENT" 
                    active={status === "PRESENT"} 
                    onClick={() => handleSetStatus(student.id, "PRESENT")} 
                  />
                  <AttendanceButton 
                    status="ABSENT" 
                    active={status === "ABSENT"} 
                    onClick={() => handleSetStatus(student.id, "ABSENT")} 
                  />
                  <AttendanceButton 
                    status="LATE" 
                    active={status === "LATE"} 
                    onClick={() => handleSetStatus(student.id, "LATE")} 
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <CardFooter className="p-6 bg-white dark:bg-slate-950 border-t border-slate-50 dark:border-slate-800">
        <Button 
          className={cn(
            "w-full h-14 rounded-2xl text-lg font-black transition-all shadow-lg items-center gap-2",
            isFinished ? "bg-primary shadow-primary/20" : "bg-slate-200 text-slate-400 hover:bg-slate-200 cursor-not-allowed opacity-50"
          )}
          disabled={!isFinished || isSaving}
          onClick={handleSave}
        >
          {isSaving ? (
             <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          حفظ كشف الحضور
        </Button>
      </CardFooter>
    </Card>
  )
}

function AttendanceButton({ status, active, onClick }: { status: AttendanceStatus, active: boolean, onClick: () => void }) {
  const configs = {
    PRESENT: { icon: Check, label: "حضر", color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900" },
    ABSENT: { icon: X, label: "غاب", color: "bg-rose-500", light: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900" },
    LATE: { icon: Clock, label: "متأخر", color: "bg-amber-500", light: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900" },
    NONE: { icon: MoreHorizontal, label: "", color: "bg-slate-500", light: "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900" }
  }

  const config = configs[status === "NONE" ? "NONE" : status]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        "h-10 px-3 sm:px-4 rounded-xl flex items-center gap-2 text-xs font-black transition-all border",
        active ? `${config.color} text-white border-transparent shadow-md scale-110 z-10` : config.light
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline-block">{config.label}</span>
    </button>
  )
}
