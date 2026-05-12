"use client"

import React, { useState, useEffect, useCallback } from "react"
import { QrCode, X, CheckCircle2, AlertCircle, Camera, RefreshCcw } from "lucide-react"
import { Html5QrcodeScanner, Html5QrcodeScannerState } from "html5-qrcode"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { showToast } from "@/components/ui/Toast"
import { toArabicDigits, cn } from "@/lib/utils"

// --- Types ---

interface ScanResult {
  success: boolean
  sessionName?: string
  time?: string
  error?: string
}

export function QRScanner() {
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scannerId] = useState(`qr-reader-${Math.random().toString(36).substr(2, 9)}`)
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)

  const onScanSuccess = useCallback((decodedText: string) => {
    // Mock validation logic
    if (scanner) {
      scanner.clear()
    }

    if (decodedText.startsWith("SESS-")) {
      setResult({
        success: true,
        sessionName: "الرياضيات - المجموعة أ",
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true })
      })
      showToast.success("تم تسجيل حضورك بنجاح")
    } else {
      setResult({
        success: false,
        error: "رمز QR غير صالح أو منتهي الصلاحية"
      })
      showToast.error("فشل تسجيل الحضور")
    }
  }, [scanner])

  const onScanError = useCallback((err: any) => {
    // We ignore common scan errors as they happen multiple times per second
  }, [])

  useEffect(() => {
    if (isOpen && !result) {
      const newScanner = new Html5QrcodeScanner(
        scannerId,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        /* verbose= */ false
      )
      
      newScanner.render(onScanSuccess, onScanError)
      setScanner(newScanner)

      return () => {
        newScanner.clear().catch(err => console.error("Failed to clear scanner", err))
      }
    }
  }, [isOpen, result, scannerId, onScanSuccess, onScanError])

  const resetScanner = () => {
    setResult(null)
    setIsOpen(true)
  }

  return (
    <div className="w-full flex flex-col items-center gap-4" dir="rtl">
      <Button 
        variant="default" 
        className="h-auto min-h-20 w-full rounded-[24px] gap-3 bg-[linear-gradient(135deg,_#1A5276,_#3498DB)] px-4 py-4 text-base font-black shadow-xl shadow-primary/20 transition-all active:scale-95 sm:h-24 sm:rounded-[32px] sm:gap-4 sm:text-xl"
        onClick={() => setIsOpen(true)}
      >
        <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
          <QrCode className="h-6 w-6 text-white" />
        </div>
        <div className="flex min-w-0 flex-col items-start gap-0.5 text-start">
          <span>سجّل حضوري الآن</span>
          <span className="text-[10px] font-bold uppercase leading-none tracking-normal opacity-70 sm:tracking-widest">امسح رمز الـ QR من المدرس</span>
        </div>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-md animate-in fade-in duration-300 sm:p-4">
          <Card className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[24px] border-none bg-white shadow-2xl dark:bg-slate-950 sm:rounded-[32px]">
            <Button 
              variant="ghost" 
              className="absolute top-4 left-4 h-10 w-10 p-0 rounded-full z-10"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {!result ? (
              <div className="flex flex-col items-center space-y-5 p-4 sm:space-y-6 sm:p-8">
                <div className="text-center">
                  <CardTitle className="text-xl font-black">ماسح رموز الحضور</CardTitle>
                  <p className="text-sm text-slate-500 font-bold mt-1">وجّه الكاميرا نحو رمز المدرس لبدء المسح</p>
                </div>

                <div className="relative aspect-square w-full overflow-hidden rounded-[28px] border-4 border-slate-50 bg-slate-900 shadow-inner dark:border-slate-800 sm:rounded-[40px] sm:border-8">
                  <div id={scannerId} className="w-full h-full" />
                  
                  {/* Decorative Scan Overlay */}
                  <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-0.5 bg-primary/50 animate-bounce shadow-[0_0_15px_#1A5276]" />
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-400 dark:bg-slate-900 sm:rounded-full">
                  <Camera className="h-4 w-4" />
                  <span>تأكد من وجود إضاءة كافية وسرعة إنترنت مستقرة</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 p-5 text-center animate-in zoom-in-95 duration-500 sm:gap-6 sm:p-12">
                {result.success ? (
                  <>
                    <div className="h-24 w-24 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-16 w-16" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">تم تسجيل حضورك!</h3>
                      <div className="space-y-2 rounded-[20px] border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:rounded-[24px] sm:p-6">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{result.sessionName}</p>
                        <p className="text-xs text-slate-400">توقيت الحضور: {toArabicDigits(result.time || "")}</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full h-12 rounded-2xl font-black mt-4"
                      onClick={() => setIsOpen(false)}
                    >
                      إغلاق الماسح
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="h-24 w-24 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-16 w-16" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">خطأ في الحضور</h3>
                      <p className="text-sm text-rose-600 dark:text-rose-400 font-bold max-w-xs">{result.error}</p>
                    </div>
                    <div className="w-full space-y-3 mt-4">
                      <Button 
                        variant="outline"
                        className="w-full h-12 rounded-2xl font-black border-slate-200 dark:border-slate-800 gap-2"
                        onClick={resetScanner}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        إعادة المسح
                      </Button>
                      <Button 
                        className="w-full h-12 rounded-2xl font-black"
                        onClick={() => setIsOpen(false)}
                      >
                        إلغاء والعودة للرئيسية
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
