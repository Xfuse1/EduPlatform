'use client';

import { CheckCircle2, Delete, ShieldCheck, TimerReset } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { registerStudentAction, verifyOTPAction } from "@/modules/auth/actions";
import { setPinAction } from "@/modules/auth/pin-actions";
// OTP send/confirm now use the unified firebasePhoneOtp lib to avoid module-chunk split issues

const OTP_LENGTH = 6;

function sanitizeNextPath(value?: string) {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return "";
  }

  return normalized;
}

// ─── PIN Setup Prompt ─────────────────────────────────────────────────────────
function PinSetupPrompt({ redirectTo }: { redirectTo: string }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  const current = stage === "enter" ? pin : confirmPin;
  const setCurrent = stage === "enter" ? setPin : setConfirmPin;

  const handleKey = (key: string) => {
    setError("");
    if (key === "del") { setCurrent((v) => v.slice(0, -1)); return; }
    if (current.length >= 8) return;
    setCurrent((v) => v + key);
  };

  const confirmPin_entry = () => {
    if (pin.length < 4) return;
    setStage("confirm");
    setError("");
  };

  const handleConfirmPinSubmit = () => {
    if (stage !== "confirm" || confirmPin.length < 4) return;

    if (confirmPin.length !== pin.length) {
      setError("أعد إدخال نفس عدد أرقام الـ PIN");
      return;
    }

    if (confirmPin !== pin) {
      setError("الـ PIN غير متطابق، حاول مرة أخرى");
      setConfirmPin("");
      setStage("enter");
      setPin("");
      return;
    }

    startTransition(async () => {
      const result = await setPinAction(pin);
      if (!result.success) { setError(result.message ?? "تعذر حفظ الـ PIN"); return; }
      setDone(true);
      window.setTimeout(() => window.location.replace(redirectTo), 1000);
    });
  };

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="font-bold text-emerald-300">تم تفعيل الـ PIN بنجاح!</p>
        <p className="text-sm text-slate-400">جارٍ تحويلك...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="font-bold text-white">
          {stage === "enter" ? "اختر PIN جديد (4-8 أرقام)" : "أكّد الـ PIN"}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {stage === "enter" ? "سيُستخدم بدلاً من OTP في المرات القادمة" : "أعد إدخال نفس الـ PIN للتأكيد"}
        </p>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-3" dir="ltr">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`h-3 w-3 rounded-full border-2 transition-all duration-150 ${i < current.length ? "scale-110 border-sky-400 bg-sky-400" : "border-slate-600 bg-transparent"}`} />
        ))}
      </div>

      {error ? <p className="text-center text-sm text-rose-300">{error}</p> : null}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key, i) => {
          if (key === "") return <div key={i} />;
          if (key === "del") {
            return (
              <button key={i} type="button" aria-label="حذف" onClick={() => handleKey("del")}
                className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 active:scale-95">
                <Delete className="h-4 w-4" />
              </button>
            );
          }
          return (
            <button key={i} type="button" onClick={() => handleKey(key)} disabled={isPending}
              className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-base font-bold text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-50">
              {key}
            </button>
          );
        })}
      </div>

      {stage === "enter" ? (
        <button
          type="button"
          disabled={pin.length < 4 || isPending}
          onClick={confirmPin_entry}
          className="w-full rounded-2xl bg-sky-500 py-3 text-base font-bold text-white transition hover:bg-sky-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-500 disabled:active:scale-100"
        >
          تأكيد الـ PIN
        </button>
      ) : (
        <button
          type="button"
          disabled={confirmPin.length < 4 || isPending}
          onClick={handleConfirmPinSubmit}
          className="w-full rounded-2xl bg-sky-500 py-3 text-base font-bold text-white transition hover:bg-sky-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-500 disabled:active:scale-100"
        >
          تأكيد وحفظ الـ PIN
        </button>
      )}

      {isPending ? <p className="text-center text-sm text-slate-400">جارٍ الحفظ...</p> : null}

      <button type="button" onClick={() => window.location.replace(redirectTo)}
        className="w-full text-center text-sm text-slate-500 transition hover:text-slate-300">
        تخطّي — لا أريد PIN الآن
      </button>
    </div>
  );
}

export function OTPInput({
  phone,
  tenantName,
  actualTenantId,
  nextPath,
  mode,
  studentName,
  gradeLevel,
}: {
  phone: string;
  tenantName: string;
  actualTenantId?: string;
  nextPath?: string;
  mode?: string;
  studentName?: string;
  gradeLevel?: string;
}) {
  const safeNextPath = sanitizeNextPath(nextPath);
  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [pinSetupRedirectTo, setPinSetupRedirectTo] = useState<string | null>(null);
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
        try {
          const { confirmFirebasePhoneOtp } = await import("@/modules/auth/lib/firebasePhoneOtp");
          const confirmed = await confirmFirebasePhoneOtp(code);

          if (!confirmed.success || !confirmed.idToken) {
            setError(confirmed.message ?? "كود التحقق غير صحيح");
            setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
            inputsRef.current[0]?.focus();
            return;
          }

          const idToken = confirmed.idToken;

          const formData = new FormData();
          formData.set("phone", phone);
          formData.set("idToken", idToken);
          if (actualTenantId) formData.set("actualTenantId", actualTenantId);

          let result;
          if (mode === "register") {
            formData.set("studentName", studentName ?? "");
            formData.set("gradeLevel", gradeLevel ?? "");
            result = await registerStudentAction(formData);
          } else {
            result = await verifyOTPAction(formData);
          }

          if (!result.success) {
            setError(result.message ?? "تعذر التحقق من الكود");
            setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
            inputsRef.current[0]?.focus();
            return;
          }

          // Only show PIN setup if user doesn't have one yet
          if (result.hasPin) {
            window.location.replace(safeNextPath || result.redirectTo || "/teacher");
          } else {
            setPinSetupRedirectTo(safeNextPath || result.redirectTo || "/teacher");
          }
        } catch (err: unknown) {
          console.error("OTP confirm failed:", err);
          const firebaseError = err as { code?: string };
          if (firebaseError.code === "auth/invalid-verification-code") {
            setError("كود التحقق غير صحيح");
          } else if (firebaseError.code === "auth/code-expired") {
            setError("انتهت صلاحية الكود، يرجى إعادة الإرسال");
          } else {
            setError("تعذر التحقق من الكود");
          }
          setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
          inputsRef.current[0]?.focus();
        }
      });
    }
  }, [actualTenantId, code, digits, phone, safeNextPath]);

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
    if (secondsLeft > 0) return;

    startTransition(async () => {
      const { sendFirebasePhoneOtp } = await import("@/modules/auth/lib/firebasePhoneOtp");
      const result = await sendFirebasePhoneOtp(phone, "recaptcha-container-otp");

      if (!result.success) {
        setError(result.message ?? "تعذر إعادة الإرسال");
        return;
      }

      setSecondsLeft(60);
    });
  };

  if (pinSetupRedirectTo) {
    return (
      <Card className="overflow-hidden rounded-[24px] border-white/10 bg-slate-950/85 text-white backdrop-blur">
        <div className="bg-[linear-gradient(135deg,_#163b54,_#1A5276_45%,_#2E86C1)] px-6 py-7 text-center text-white sm:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">فعّل الـ PIN</h1>
          <p className="mt-2 text-sm text-white/80">ادخل بسرعة في المرات الجاية بدون OTP</p>
        </div>
        <CardContent className="p-6 sm:p-8">
          <PinSetupPrompt redirectTo={pinSetupRedirectTo} />
        </CardContent>
      </Card>
    );
  }

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
              aria-label={`الرقم ${index + 1} من كود التحقق`}
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

      {/* Invisible reCAPTCHA container for resend */}
      <div aria-hidden="true" id="recaptcha-container-otp" />
    </Card>
  );
}
