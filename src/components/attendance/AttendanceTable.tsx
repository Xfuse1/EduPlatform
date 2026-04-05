"use client"

import React, { useState, useMemo } from "react"
import { Search, Filter, Calendar, FileDown, User, CheckCircle2, XCircle, Clock, QrCode, LayoutList } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toArabicDigits, cn } from "@/lib/utils"
import { showToast } from "@/components/ui/Toast"

// --- Types ---

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE"
type AttendanceMethod = "QR" | "MANUAL"

interface AttendanceRecord {
  id: string
  studentName: string
  groupName: string
  date: string
  status: AttendanceStatus
  method: AttendanceMethod
}

// --- Mock Data ---

const MOCK_RECORDS: AttendanceRecord[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `rec-${i}`,
  studentName: ["أحمد محمد", "سارة خالد", "محمود حسن", "ليلى علي", "زياد سعيد"][i % 5],
  groupName: ["المجموعة أ", "المجموعة ب", "المجموعة ج"][i % 3],
  date: `2026-03-${28 - i > 0 ? 28 - i : 1}`,
  status: i % 7 === 0 ? "ABSENT" : i % 5 === 0 ? "LATE" : "PRESENT",
  method: i % 2 === 0 ? "QR" : "MANUAL",
}))

export function AttendanceTable() {
  const [query, setQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState("ALL")
  const [records, setRecords] = useState<AttendanceRecord[]>(MOCK_RECORDS)

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesQuery = record.studentName.includes(query) || record.groupName.includes(query)
      const matchesGroup = groupFilter === "ALL" || record.groupName === groupFilter
      return matchesQuery && matchesGroup
    })
  }, [query, groupFilter, records])

  const exportToCSV = () => {
    const headers = ["الاسم,المجموعة,التاريخ,الحالة,الطريقة"]
    const rows = filteredRecords.map(r => 
      `${r.studentName},${r.groupName},${r.date},${r.status},${r.method}`
    )
    
    const csvContent = "\uFEFF" + headers.concat(rows).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    
    link.setAttribute("href", url)
    link.setAttribute("download", `attendance_export_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showToast.success("تم تصدير البيانات بنجاح")
  }

  return (
    <Card className="w-full border-none shadow-xl overflow-hidden rounded-[32px] bg-white dark:bg-slate-950" dir="rtl">
      <CardHeader className="p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-black">تعقّب الحضور الكامل</CardTitle>
            <CardDescription className="text-slate-500 font-bold mt-1">إظهار جميع السجلات لكل الطلاب والمجموعات</CardDescription>
          </div>
          <Button 
            variant="outline" 
            className="rounded-2xl h-12 gap-2 border-slate-200 dark:border-slate-800 font-black text-sm"
            onClick={exportToCSV}
            disabled={filteredRecords.length === 0}
          >
            <FileDown className="h-4 w-4" />
            تصدير CSV
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              className="pr-10 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-sm"
              placeholder="ابحث باسم الطالب أو المجموعة..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Select 
              value={groupFilter} 
              onChange={(e) => setGroupFilter(e.target.value)}
              className="pr-10 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-sm font-bold"
            >
              <option value="ALL">كل المجموعات</option>
              <option value="المجموعة أ">المجموعة أ</option>
              <option value="المجموعة ب">المجموعة ب</option>
              <option value="المجموعة ج">المجموعة ج</option>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">اسم الطالب</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">المجموعة</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">التاريخ</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">الحالة</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">الطريقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary opacity-50" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{record.studentName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-500">{record.groupName}</td>
                    <td className="p-4 text-sm font-medium text-slate-500 tabular-nums">{toArabicDigits(record.date)}</td>
                    <td className="p-4">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 opacity-60">
                        {record.method === "QR" ? (
                          <QrCode className="h-3 w-3" />
                        ) : (
                          <LayoutList className="h-3 w-3" />
                        )}
                        <span className="text-[11px] font-bold">{record.method === "QR" ? "تلقائي QR" : "يدوي بالمدرس"}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center space-y-4 opacity-50 grayscale animate-pulse">
                    <Filter className="h-12 w-12 mx-auto text-slate-300" />
                    <p className="text-sm font-black uppercase tracking-widest leading-loose">عفواً، لا توجد سجلات تطابق البحث المختار</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      {filteredRecords.length > 0 && (
        <CardFooter className="p-6 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center border-t">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي السجلات المعروضة: {toArabicDigits(filteredRecords.length)}</p>
        </CardFooter>
      )}
    </Card>
  )
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const configs = {
    PRESENT: { label: "حضر", variant: "success", icon: CheckCircle2 },
    ABSENT: { label: "غاب", variant: "destructive", icon: XCircle },
    LATE: { label: "متأخر", variant: "warning", icon: Clock },
  } as const

  const config = configs[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="gap-1.5 px-3 py-1 text-[11px] font-black rounded-full shadow-sm">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
