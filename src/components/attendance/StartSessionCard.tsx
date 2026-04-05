"use client"

import React, { useState, useEffect } from "react"
import { Clock, Users, QrCode, RefreshCcw, LayoutList, CheckCircle2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toArabicDigits, cn } from "@/lib/utils"

// --- Types ---

interface SessionInfo {
  id: string
  groupName: string
  timeRange: string
  studentsCount: number
}

// --- Mock Data ---

const MOCK_SESSION: SessionInfo = {
  id: "session-123",
  groupName: "الرياضيات - المجموعة أ",
  timeRange: "04:00 م - 06:00 م",
  studentsCount: 24,
}

export function StartSessionCard({ session = MOCK_SESSION, onManualAttendance }: { session?: SessionInfo, onManualAttendance: () => void }) {
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "STARTED" | "EXPIRED">("IDLE")
  const [qrToken, setQrToken] = useState("")
  const [timeLeft, setTimeLeft] = useState(900) // 15:00

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (status === "STARTED" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setStatus("EXPIRED")
    }
    return () => clearInterval(timer)
  }, [status, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${toArabicDigits(mins)}:${toArabicDigits(secs.toString().padStart(2, '0'))}`
  }

  const handleStartSession = () => {
    setStatus("LOADING")
    // Mock API call
    setTimeout(() => {
      setQrToken(`SESS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`)
      setStatus("STARTED")
      setTimeLeft(900)
    }, 1500)
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-none shadow-xl bg-white dark:bg-slate-950 transition-all duration-300">
      <div className="bg-[linear-gradient(135deg,_#1A5276,_#2E86C1)] p-6 text-white">
        <div className="flex justify-between items-start">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">حصّة جارية</Badge>
          <div className="flex items-center gap-1.5 opacity-80">
            <Users className="h-4 w-4" />
            <span className="text-xs font-bold">{toArabicDigits(session.studentsCount)} طالب مسجّل</span>
          </div>
        </div>
        <CardTitle className="mt-4 text-2xl font-black">{session.groupName}</CardTitle>
        <div className="mt-2 flex items-center gap-2 opacity-75 text-sm font-bold">
          <Clock className="h-4 w-4" />
          <span>{session.timeRange}</span>
        </div>
      </div>

      <CardContent className="p-8 flex flex-col items-center gap-6">
        {status === "IDLE" && (
          <div className="py-10 text-center space-y-6">
            <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
              <QrCode className="h-12 w-12 text-primary opacity-20" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">هل أنت مستعد لبدء الحصة؟</h3>
              <p className="text-sm text-slate-500">سيتم توليد رمز QR ليقوم الطلاب بمسحه وتسجيل حضورهم ذاتياً.</p>
            </div>
            <Button 
              className="w-full h-14 text-lg font-black rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={handleStartSession}
            >
              ابدأ الحصة الآن
            </Button>
          </div>
        )}

        {status === "LOADING" && (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent animate-spin rounded-full" />
            <p className="text-sm font-bold text-slate-500 animate-pulse">جاري تحضير الحصة وتوليد الرموز...</p>
          </div>
        )}

        {(status === "STARTED" || status === "EXPIRED") && (
          <div className="w-full flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
            <div className="relative p-6 bg-white rounded-[32px] border-4 border-slate-50 shadow-inner">
              <div className={cn("transition-opacity duration-300", status === "EXPIRED" ? "opacity-10 grayscale blur-[2px]" : "opacity-100")}>
                <QRCodeSVG value={qrToken} size={200} level="H" includeMargin />
              </div>
              
              {status === "EXPIRED" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <Badge variant="destructive" className="mb-2">منتهي الصلاحية</Badge>
                  <Button variant="outline" className="rounded-xl gap-2 h-10 px-4 text-xs" onClick={handleStartSession}>
                    <RefreshCcw className="h-4 w-4" />
                    تحديث الرمز
                  </Button>
                </div>
              )}
            </div>

            <div className="w-full space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">الـ QR متاح للمسح الآن</span>
              </div>
              <div className="text-4xl font-black text-slate-900 dark:text-white tracking-widest tabular-nums font-mono">
                {formatTime(timeLeft)}
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">الوقت المتبقي لصلاحية الرمز</p>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

            <div className="w-full grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="rounded-2xl h-12 gap-2 border-slate-200 dark:border-slate-800"
                onClick={onManualAttendance}
              >
                <LayoutList className="h-4 w-4" />
                تسجيل يدوي
              </Button>
              <Button 
                variant="outline" 
                className="rounded-2xl h-12 gap-2 border-slate-200 dark:border-slate-800 text-emerald-600 hover:text-emerald-700"
                onClick={() => {}}
              >
                <CheckCircle2 className="h-4 w-4" />
                إنهاء الحصة
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
