'use client';

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
    <Card className="overflow-hidden">
      <div className="bg-primary px-6 py-8 text-center text-white sm:px-8">
        <p className="text-sm font-medium text-white/80">{tenantName}</p>
        <h1 className="mt-3 text-2xl font-extrabold">أدخل كود التحقق</h1>
        <p className="mt-3 text-sm leading-7 text-white/90">
          أدخل كود التحقق المرسل إلى <span dir="ltr">{phone}</span>
        </p>
      </div>

      <CardContent className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-2" dir="ltr">
          {digits.map((digit, index) => (
            <input
              key={`otp-digit-${index}`}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              className="touch-target h-12 w-12 rounded-2xl border border-slate-300 text-center text-xl font-bold text-slate-900 outline-none transition focus:border-secondary sm:h-14 sm:w-14"
              inputMode="numeric"
              maxLength={1}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              value={digit}
            />
          ))}
        </div>

        {error ? <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 text-center text-sm text-slate-600">
          {secondsLeft > 0 ? (
            <p>
              يمكنك إعادة الإرسال بعد <span dir="ltr">{secondsLeft}</span> ثانية
            </p>
          ) : (
            <button className="touch-target font-semibold text-primary" onClick={handleResend} type="button">
              إعادة إرسال الكود
            </button>
          )}
        </div>

        <Button className="mt-6 w-full" disabled={isPending || code.length !== OTP_LENGTH}>
          {isPending ? "جارٍ التحقق..." : "جارٍ انتظار اكتمال الكود"}
        </Button>
      </CardContent>
    </Card>
  );
}
