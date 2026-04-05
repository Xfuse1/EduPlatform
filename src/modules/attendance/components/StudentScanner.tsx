'use client';

import { Html5QrcodeScanner } from "html5-qrcode";
import { Camera, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function StudentScanner() {
  const [status, setStatus] = useState<"IDLE" | "SCANNING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");

  const startScanning = () => {
    setStatus("SCANNING");
    
    // Slight delay to ensure DOM is ready for the scanner container
    setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            /* verbose= */ false
        );

        const onScanSuccess = async (decodedText: string) => {
            scanner.clear();
            await completeCheckin(decodedText);
        };

        const onScanFailure = (error: any) => {
            // Silence common failures to avoid spamming the log
        };

        scanner.render(onScanSuccess, onScanFailure);
    }, 100);
  };

  const completeCheckin = async (token: string) => {
    try {
      const res = await fetch("/api/attendance/qr-checkin", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus("SUCCESS");
      } else {
        setStatus("ERROR");
        setErrorMsg(data.error || "فشل تسجيل الحضور");
      }
    } catch (err) {
      console.error(err);
      setStatus("ERROR");
      setErrorMsg("حدث خطأ تقني");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6 text-center">
        {status === "IDLE" && (
          <div className="py-12 space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Camera className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold">تسجيل حضورك</h2>
            <p className="text-slate-500">امسح كود الـ QR من شاشة المعلم لتأكيد حضورك اليوم.</p>
            <Button onClick={startScanning} className="px-10 py-5 h-14">ابدأ المسح الآن</Button>
          </div>
        )}

        {status === "SCANNING" && (
          <div className="space-y-4">
            <h3 className="font-bold">جارٍ المسح...</h3>
            <div id="reader" className="mx-auto overflow-hidden rounded-2xl ring-4 ring-primary/20 shadow-xl" style={{ width: "100%", maxWidth: "400px" }}></div>
            <Button onClick={() => setStatus("IDLE")} variant="outline">إيقاف</Button>
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="py-12 space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
            <h2 className="text-2xl font-bold text-emerald-600">تم تسجيل الحضور!</h2>
            <p className="text-slate-500">تم تسجيل حضورك بنجاح في الجلسة وإبلاغ ولي الأمر.</p>
            <Button onClick={() => setStatus("IDLE")} variant="outline">إغلاق</Button>
          </div>
        )}

        {status === "ERROR" && (
          <div className="py-12 space-y-4">
            <XCircle className="mx-auto h-16 w-16 text-rose-500" />
            <h2 className="text-2xl font-bold text-rose-600">فشل التسجيل</h2>
            <p className="text-rose-500 font-bold">{errorMsg}</p>
            <div className="flex justify-center gap-2 pt-4">
                <Button onClick={startScanning} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    حاول مرة أخرى
                </Button>
                <Button onClick={() => setStatus("IDLE")} variant="outline">رجوع</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
