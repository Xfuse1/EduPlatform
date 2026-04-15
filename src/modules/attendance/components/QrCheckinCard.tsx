'use client';

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatArabicDate, formatTimeRange12Hour } from "@/lib/utils";

type SessionPayload = {
  id: string;
  groupName: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  expiresAt: string | null;
};

type LoadState = "loading" | "ready" | "error";
type CheckinState = "idle" | "submitting" | "done";

export function QrCheckinCard({ token, studentName }: { token: string; studentName: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [checkinState, setCheckinState] = useState<CheckinState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [alreadyMarked, setAlreadyMarked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadSession = async () => {
      setLoadState("loading");
      setErrorMessage("");

      try {
        const response = await fetch(`/api/attendance/qr-checkin?token=${encodeURIComponent(token)}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "تعذر تحميل بيانات الحصة.");
        }

        setSession(data.session as SessionPayload);
        setAlreadyMarked(Boolean(data.alreadyMarked));
        setLoadState("ready");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadState("error");
        setErrorMessage(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل بيانات الحصة.");
      }
    };

    void loadSession();
    return () => controller.abort();
  }, [token]);

  const sessionTimeLabel = useMemo(() => {
    if (!session) {
      return "";
    }

    return formatTimeRange12Hour(session.timeStart, session.timeEnd);
  }, [session]);

  const handleCheckin = async () => {
    if (!session || alreadyMarked) {
      return;
    }

    setCheckinState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/attendance/qr-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "فشل تسجيل الحضور.");
      }

      setAlreadyMarked(true);
      setCheckinState("done");
    } catch (error) {
      setCheckinState("idle");
      setErrorMessage(error instanceof Error ? error.message : "فشل تسجيل الحضور.");
    }
  };

  if (loadState === "loading") {
    return (
      <Screen>
        <p className="text-center text-lg font-bold text-slate-600 animate-pulse">جارٍ تحميل بيانات الحصة...</p>
      </Screen>
    );
  }

  if (loadState === "error" || !session) {
    return (
      <Screen>
        <p className="text-center text-lg font-bold text-rose-600">{errorMessage || "تعذر تحميل بيانات الحصة."}</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card className="w-full max-w-lg overflow-hidden border-slate-200 dark:border-slate-800">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold text-slate-500">تسجيل الحضور عبر QR</p>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">مرحبًا {studentName}</h1>
            <p className="text-sm text-slate-500">راجع بيانات الحصة ثم اضغط على زر تسجيل الحضور.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{session.groupName}</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>{formatArabicDate(session.date)}</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                <span dir="ltr">{sessionTimeLabel}</span>
              </p>
            </div>
          </div>

          {errorMessage ? <p className="text-center text-sm font-bold text-rose-600">{errorMessage}</p> : null}

          <Button
            className="w-full"
            disabled={alreadyMarked || checkinState === "submitting"}
            onClick={handleCheckin}
            type="button"
          >
            {alreadyMarked
              ? "تم تسجيل حضورك"
              : checkinState === "submitting"
                ? "جارٍ تسجيل الحضور..."
                : "تسجيل الحضور"}
          </Button>

          {checkinState === "done" || alreadyMarked ? (
            <p className="text-center text-sm font-bold text-emerald-600">تم تحويل حالتك إلى حاضر بنجاح.</p>
          ) : null}
        </CardContent>
      </Card>
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-4">{children}</div>;
}
