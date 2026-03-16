'use client';

import { CheckCircle2, TimerReset } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resendOTP, verifyOTPAction } from "@/modules/auth/actions";

const OTP_LENGTH = 6;

export function OTPInput({ phone, tenantName }: { phone: string; tenantName: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isPending, startTransition] = useTransition();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const code = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    if (code.length === OTP_LENGTH && !digits.includes("")) {
      startTransition(async () => {
        const formData = new FormData();
        formData.set("phone", phone);
        formData.set("code", code);

        const result = await verifyOTPAction(formData);

        if (!result.success) {
          setError(result.message ?? "تعذر التحقق من الكود");
          setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
          inputsRef.current[0]?.focus();
          return;
        }

        router.push(result.redirectTo ?? "/teacher");
      });
    }
  }, [code, digits, phone, router, startTransition]);

  const handleChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = nextValue;
    setDigits(nextDigits);
    setError("");

    if (nextValue && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (secondsLeft > 0) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("phone", phone);
      const result = await resendOTP(formData);

      if (!result.success) {
        setError(result.message ?? "تعذر إعادة الإرسال");
        return;
      }

      setSecondsLeft(60);
    });
  };

  return (
    <Card className="overflow-hidden rounded-[24px] border-slate-200/80 dark:border-slate-800">
      <div className="bg-[linear-gradient(135deg,_#163b54,_#1A5276_45%,_#2E86C1)] px-6 py-8 text-center text-white sm:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm font-medium text-white/80">{tenantName}</p>
        <h1 className="mt-3 text-3xl font-extrabold">أدخل كود التحقق</h1>
        <p className="mt-3 text-sm leading-7 text-white/90">
          أدخل الكود المرسل إلى <span dir="ltr">{phone}</span>
        </p>
      </div>

      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="flex items-center justify-between rounded-[16px] bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
          <div className="text-start">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">مدة صلاحية الكود</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">يرجى إدخال الرمز قبل انتهاء العد التنازلي</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm dark:bg-slate-800">
            <TimerReset className="h-4 w-4" />
            <span dir="ltr">{secondsLeft}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2" dir="ltr">
          {digits.map((digit, index) => (
            <input
              key={`otp-digit-${index}`}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              className="touch-target h-14 w-14 rounded-xl border border-slate-300 bg-white text-center text-2xl font-extrabold text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:h-14 sm:w-14"
              inputMode="numeric"
              maxLength={1}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              value={digit}
            />
          ))}
        </div>

        {error ? (
          <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-4 text-center dark:border-slate-800 dark:bg-slate-900">
          {secondsLeft > 0 ? (
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              يمكنك إعادة الإرسال بعد <span dir="ltr">{secondsLeft}</span> ثانية
            </p>
          ) : (
            <button
              className="touch-target inline-flex min-h-11 items-center justify-center rounded-xl bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/15 dark:bg-sky-400/10 dark:text-sky-300"
              onClick={handleResend}
              type="button"
            >
              إعادة إرسال الكود
            </button>
          )}
        </div>

        <Button className="w-full text-base" disabled={isPending || code.length !== OTP_LENGTH}>
          {isPending ? "جارٍ التحقق..." : "بانتظار اكتمال إدخال الكود"}
        </Button>
      </CardContent>
    </Card>
  );
}
