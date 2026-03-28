'use client';

import { Check, Clock, QrCode, RefreshCcw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
  phone: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  method: "QR" | "MANUAL" | "GPS" | "CODE";
  markedAt: Date | string | null;
};

type Session = {
  id: string;
  title: string;
  status: string;
  qrToken: string | null;
  qrExpiresAt: string | Date | null;
  students: Student[];
};

export function SessionManagement({ initialSession }: { initialSession: Session }) {
  const [session, setSession] = useState(initialSession);
  const [loading, setLoading] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Update timer
  useEffect(() => {
    if (!session.qrExpiresAt || session.status !== "IN_PROGRESS") {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const expires = new Date(session.qrExpiresAt!).getTime();
      const diff = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [session.qrExpiresAt, session.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startSession = async () => {
    setLoading("start");
    try {
      const res = await fetch(`/api/attendance/sessions/${session.id}/start`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSession({ ...session, status: "IN_PROGRESS", qrToken: data.token, qrExpiresAt: data.expiresAt });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const markStudent = async (studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    setLoading(studentId);
    try {
      const res = await fetch(`/api/attendance/sessions/${session.id}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedStudents = session.students.map((s) =>
          s.id === studentId ? { ...s, status, method: "MANUAL" as const, markedAt: new Date() } : s
        );
        setSession({ ...session, students: updatedStudents });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Session Controls & QR */}
      <Card className="lg:col-span-1">
        <CardContent className="space-y-6 pt-6 text-center">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{session.title}</h2>
            <p className="text-sm text-slate-500">الحالة: {session.status}</p>
          </div>

          {session.status === "SCHEDULED" ? (
            <Button className="w-full" disabled={loading === "start"} onClick={startSession}>
              <QrCode className="me-2 h-5 w-5" />
              ابدأ الحصة وتوليد QR
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="mx-auto flex aspect-square w-full max-w-[200px] items-center justify-center rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-200">
                {session.qrToken ? (
                  <QRCodeSVG size={180} value={session.qrToken} />
                ) : (
                  <p className="text-sm text-slate-400">انتهت صلاحية الـ QR</p>
                )}
              </div>

              {timeLeft > 0 ? (
                <div className="flex items-center justify-center gap-2 text-rose-500 font-bold">
                  <Clock className="h-4 w-4" />
                  <span>ينتهي خلال {formatTime(timeLeft)}</span>
                </div>
              ) : (
                <Button className="w-full" onClick={startSession} variant="outline">
                  <RefreshCcw className="me-2 h-4 w-4" />
                  تجديد كود الـ QR
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student List */}
      <Card className="lg:col-span-2">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">قائمة الحضور ({session.students.filter(s => s.status === 'PRESENT').length}/{session.students.length})</h3>
          </div>
          
          <div className="space-y-3">
            {session.students.map((student) => (
              <div key={student.id} className="flex items-center justify-between rounded-xl border p-3 dark:border-slate-800">
                <div>
                  <p className="font-bold">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.phone}</p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button
                    onClick={() => markStudent(student.id, "PRESENT")}
                    variant={student.status === "PRESENT" ? "default" : "outline"}
                    className={cn(
                        "rounded-full h-9 w-9 sm:h-10 sm:w-10 min-h-0 px-0 translate-y-0",
                        student.status === "PRESENT" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-white dark:bg-slate-900"
                    )}
                    title="حاضر"
                    disabled={loading === student.id}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => markStudent(student.id, "LATE")}
                    variant={student.status === "LATE" ? "default" : "outline"}
                    className={cn(
                        "rounded-full h-9 w-9 sm:h-10 sm:w-10 min-h-0 px-0 translate-y-0",
                        student.status === "LATE" ? "bg-amber-500 hover:bg-amber-600" : "bg-white dark:bg-slate-900"
                    )}
                    title="متأخر"
                    disabled={loading === student.id}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => markStudent(student.id, "ABSENT")}
                    variant={student.status === "ABSENT" ? "default" : "outline"}
                    className={cn(
                        "rounded-full h-9 w-9 sm:h-10 sm:w-10 min-h-0 px-0 translate-y-0",
                        student.status === "ABSENT" ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200" : "bg-white dark:bg-slate-900"
                    )}
                    title="غائب"
                    disabled={loading === student.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {(student.status === "PRESENT" || student.status === "LATE") && (
                    <span className="text-[9px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {student.method === 'QR' ? 'تلقائي' : 'يدوي'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
