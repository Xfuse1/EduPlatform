"use client"

import React from "react"
import { ClipboardList, GraduationCap, Clock, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// --- Types ---

interface ChildAssignmentData {
  childId: string
  childName: string
  lastPendingAssignment?: {
    title: string
    dueDate: string
  }
  lastGrade?: {
    assignmentTitle: string
    grade: number
    maxGrade: number
  }
}

export function ParentAssignments({ data }: { data: ChildAssignmentData[] }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">متابعة الواجبات</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.map((child) => (
          <ChildAssignmentCard key={child.childId} data={child} />
        ))}
      </div>
    </div>
  )
}

function ChildAssignmentCard({ data }: { data: ChildAssignmentData }) {
  return (
    <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-slate-900">
      <div className="bg-primary/5 px-4 py-3 border-b border-primary/10">
        <h3 className="font-bold text-lg text-primary flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {data.childName}
        </h3>
      </div>
      <CardContent className="p-4 space-y-4">
        {/* Pending Assignment */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">آخر واجب معلق</p>
          {data.lastPendingAssignment ? (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{data.lastPendingAssignment.title}</p>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1">تاريخ التسليم: {data.lastPendingAssignment.dueDate}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 text-center">{data.childName} لا يملك واجبات معلقة ✨</p>
            </div>
          )}
        </div>

        {/* Last Grade */}
        {data.lastGrade && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">آخر درجة حصل عليها</p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{data.lastGrade.assignmentTitle}</p>
              </div>
              <Badge variant="success" className="bg-emerald-500 text-white border-none font-bold">
                {data.lastGrade.grade} / {data.lastGrade.maxGrade}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
