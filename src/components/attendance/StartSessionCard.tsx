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
    <Card className="mx-auto w-full max-w-md overflow-hidden border-none bg-white shadow-xl transition-all duration-300 dark:bg-slate-950">
      <div className="bg-[linear-gradient(135deg,_#1A5276,_#2E86C1)] p-4 text-white sm:p-6">
        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">حصّة جارية</Badge>
          <div className="flex items-center gap-1.5 opacity-80">
            <Users className="h-4 w-4" />
            <span className="text-xs font-bold">{toArabicDigits(session.studentsCount)} طالب مسجّل</span>
          </div>
        </div>
        <CardTitle className="mt-4 text-xl font-black sm:text-2xl">{session.groupName}</CardTitle>
        <div className="mt-2 flex items-center gap-2 opacity-75 text-sm font-bold">
          <Clock className="h-4 w-4" />
          <span>{session.timeRange}</span>
        </div>
      </div>

      <CardContent className="flex flex-col items-center gap-5 p-4 sm:gap-6 sm:p-8">
        {status === "IDLE" && (
          <div className="space-y-5 py-8 text-center sm:space-y-6 sm:py-10">
            <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
              <QrCode className="h-12 w-12 text-primary opacity-20" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">هل أنت مستعد لبدء الحصة؟</h3>
              <p className="text-sm text-slate-500">سيتم توليد رمز QR ليقوم الطلاب بمسحه وتسجيل حضورهم ذاتياً.</p>
            </div>
            <Button 
              className="h-14 w-full rounded-2xl text-base font-black shadow-lg shadow-primary/20 transition-all active:scale-95 sm:text-lg"
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
          <div className="flex w-full flex-col items-center gap-5 animate-in zoom-in-95 duration-500 sm:gap-6">
            <div className="relative max-w-full rounded-[24px] border-4 border-slate-50 bg-white p-3 shadow-inner sm:rounded-[32px] sm:p-6">
              <div className={cn("transition-opacity duration-300", status === "EXPIRED" ? "opacity-10 grayscale blur-[2px]" : "opacity-100")}>
                <QRCodeSVG value={qrToken} size={200} level="H" includeMargin className="h-auto max-w-full" />
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
              <div className="font-mono text-3xl font-black tracking-normal text-slate-900 dark:text-white sm:text-4xl">
                {formatTime(timeLeft)}
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">الوقت المتبقي لصلاحية الرمز</p>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

            <div className="grid w-full grid-cols-1 gap-3 min-[420px]:grid-cols-2">
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
