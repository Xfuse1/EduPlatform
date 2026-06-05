'use client';

import { ArrowLeft, Delete, Phone } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkUserPin, verifyPinAction } from "@/modules/auth/pin-actions";

type TenantSummary = {
  name: string;
  logoUrl: string | null;
  themeColor: string;
};

type LoginStep = "phone" | "pin" | "otp";

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 8;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
}

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

// ─── PIN Pad ──────────────────────────────────────────────────────────────────
function PinPad({ value, onChange, disabled = false }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="space-y-4">
      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-3" dir="ltr">
        {Array.from({ length: PIN_MAX_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full border-2 transition-all duration-150 ${
              i < value.length
                ? "scale-110 border-sky-500 bg-sky-500"
                : "border-slate-300 dark:border-slate-500 bg-transparent"
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key, i) => {
          if (key === "") return <div key={i} />;

          if (key === "del") {
            return (
              <button
                key={i}
                type="button"
                aria-label="حذف آخر رقم"
                disabled={disabled}
                onClick={() => onChange(value.slice(0, -1))}
                className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 text-slate-900 dark:text-white transition hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Delete className="h-5 w-5" />
              </button>
            );
          }

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => value.length < PIN_MAX_LENGTH && onChange(value + key)}
              className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 text-lg font-bold text-slate-900 dark:text-white transition hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LoginForm({ tenant, nextPath, isMainDomain = false }: {
  tenant: TenantSummary;
  nextPath?: string;
  isMainDomain?: boolean;
}) {
  const router = useRouter();
  const safeNextPath = sanitizeNextPath(nextPath);
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Note: intentionally NOT resetting OTP state on unmount
  // because OTPInput on /verify needs the confirmation result stored on window

  const handlePhoneSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^01\d{9}$/.test(phone)) {
      setError("يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ ٠١");
      return;
    }
    setError("");

    startTransition(async () => {
      const { hasPin, exists } = await checkUserPin(phone);

      if (!exists) {
        setShowRegisterPrompt(true);
        return;
      }

      if (hasPin) {
        setStep("pin");
        return;
      }

      // No PIN → go OTP flow within the current tenant
      await sendOtp();
    });
  };

  const sendOtp = async (tenantId?: string, registerMode?: { name: string; grade: string }) => {
    try {
      const { sendFirebasePhoneOtp } = await import("@/modules/auth/lib/firebasePhoneOtp");
      const result = await sendFirebasePhoneOtp(phone, "recaptcha-container-login");

      if (!result.success) {
        setError(result.message ?? "تعذر إرسال كود التحقق");
        return;
      }

      const params = new URLSearchParams({ phone });
      if (tenantId) params.set("tenantId", tenantId);
      if (safeNextPath) params.set("next", safeNextPath);
      if (registerMode) {
        params.set("mode", "register");
        params.set("studentName", registerMode.name);
        params.set("gradeLevel", registerMode.grade);
      }
      router.push(`/verify?${params.toString()}`);
    } catch (err) {
      console.error("[LoginForm] sendOTP failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`فشل إرسال كود التحقق: ${message}`);
    }
  };

  const handlePinSubmit = (currentPin: string) => {
    if (currentPin.length < PIN_MIN_LENGTH) return;

    setError("");

    startTransition(async () => {
      const result = await verifyPinAction(phone, currentPin);
      if (!result.success) {
        setError(result.message ?? "الـ PIN غير صحيح");
        setPin("");
        return;
      }
      window.location.replace(result.redirectTo || safeNextPath || "/teacher");
    });
  };

  // ─── Phone Step ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "pin" || isPending) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setError("");
        setPin((currentPin) => (currentPin.length < PIN_MAX_LENGTH ? currentPin + event.key : currentPin));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        setError("");
        setPin((currentPin) => currentPin.slice(0, -1));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        handlePinSubmit(pin);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, pin, step]);

  if (step === "phone") {
    return (
      <Card 
        className="overflow-hidden border-slate-200 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/5 dark:shadow-[0_0_60px_rgba(0,184,160,0.08)] rounded-[20px]"
      >
        <div className="relative px-6 pb-2 pt-8 sm:px-8">
          <div className="relative text-center">
            <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center">
              <img 
                alt="Logo" 
                className="h-full w-full object-contain" 
                src={tenant.logoUrl || "/images/logo.svg"} 
              />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              {tenant.name}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#94A3B8]">سجّل الدخول برقم الهاتف.</p>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8">
          <form className="space-y-5" onSubmit={handlePhoneSubmit}>
            <div>
              <Label className="text-slate-700 dark:text-white" htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-lg">🇪🇬</span>
                <span className="pointer-events-none absolute inset-y-0 start-14 flex items-center text-[#94A3B8]">
                  <Phone className="h-4 w-4" />
                </span>
                <Input
                  dir="ltr"
                  id="phone"
                  inputMode="numeric"
                  maxLength={11}
                  name="phone"
                  onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "")); setError(""); setShowRegisterPrompt(false); }}
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  className="rounded-[10px] border-slate-200 bg-white ps-24 text-base font-semibold text-slate-950 placeholder:text-slate-400 focus-visible:border-[#00B8A0] focus-visible:ring-[#00B8A0]/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-[#94A3B8]">
                يجب أن يبدأ الرقم بـ <span dir="ltr">01</span> ويتكون من <span dir="ltr">11</span> رقماً.
              </p>
            </div>

            {error ? (
              <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            <Button 
              className="w-full gap-2 text-base rounded-[10px] bg-[linear-gradient(135deg,#00B8A0,#1A2B6D)] hover:bg-[linear-gradient(135deg,#00c4ab,#1e3480)] hover:-translate-y-[1px] transition-all text-white border-0" 
              disabled={isPending} 
              type="submit"
            >
              <span>{isPending ? "جارٍ التحقق..." : "متابعة"}</span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </form>

          <Dialog open={showRegisterPrompt} onOpenChange={setShowRegisterPrompt}>
            <DialogContent className="max-w-md p-0">
              <DialogHeader className="bg-slate-950/95 px-4 py-4 text-white sm:px-6 sm:py-5">
                <DialogTitle>الرقم غير مرتبط بأي حساب</DialogTitle>
                <DialogDescription>
                  يبدو أن الرقم الذي أدخلته غير مسجل. اختر نوع الحساب الذي تريد إنشاؤه ثم تابع.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 bg-white px-4 py-5 dark:bg-slate-950 sm:px-6 sm:py-6">
                <p className="text-sm text-slate-600 dark:text-slate-300">هل تريد إنشاء حساب طالب، حساب ولي أمر، أم حساب معلم؟</p>
                <DialogFooter className="flex flex-col gap-3 px-0 pb-3 pt-2 sm:flex-row">
                  {!isMainDomain && (
                    <Button
                      className="flex-1 min-w-0"
                      type="button"
                      onClick={() => router.push(`/register?phone=${encodeURIComponent(phone)}`)}
                    >
                    إنشاء حساب طالب
                    </Button>
                  )}
                  {!isMainDomain && (
                    <Button
                      className="flex-1 min-w-0"
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/parent-register?phone=${encodeURIComponent(phone)}`)}
                    >
                    إنشاء حساب ولي أمر
                    </Button>
                  )}
                  {isMainDomain && (
                    <Button
                      className="flex-1 min-w-0"
                      type="button"
                      onClick={() => router.push(`/signup?phone=${encodeURIComponent(phone)}`)}
                    >
                    إنشاء حساب معلم
                    </Button>
                  )}
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>

        <div className="border-t border-slate-100 dark:border-white/5 px-6 py-4 text-center text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">
          {tenant.name}
        </div>

        <div id="recaptcha-container-login" ref={recaptchaContainerRef} />
      </Card>
    );
  }

  // ─── PIN Step ────────────────────────────────────────────────────────────────
  return (
    <Card 
      className="overflow-hidden border-slate-200 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/5 dark:shadow-[0_0_60px_rgba(0,184,160,0.08)] rounded-[20px]"
    >
      <div className="relative px-6 pb-2 pt-8 sm:px-8">
        <div className="relative text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center">
            <img 
              alt="Logo" 
              className="h-full w-full object-contain" 
              src={tenant.logoUrl || "/images/logo.svg"} 
            />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
            {tenant.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-[#94A3B8]">
            أدخل الـ PIN لـ <span dir="ltr">{phone}</span>
          </p>
        </div>
      </div>

      <CardContent className="space-y-6 p-6 sm:p-8">
        {error ? (
          <p className="rounded-[16px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm font-medium text-rose-200">
            {error}
          </p>
        ) : null}

        <PinPad
          value={pin}
          onChange={(nextPin) => { setPin(nextPin); setError(""); }}
          disabled={isPending}
        />

        <Button 
          className="w-full text-base rounded-[10px] bg-[linear-gradient(135deg,#00B8A0,#1A2B6D)] hover:bg-[linear-gradient(135deg,#00c4ab,#1e3480)] hover:-translate-y-[1px] transition-all text-white border-0" 
          disabled={isPending || pin.length < PIN_MIN_LENGTH} 
          onClick={() => handlePinSubmit(pin)} 
          type="button"
        >
          متابعة
        </Button>

        {isPending ? (
          <p className="text-center text-sm text-slate-400">جارٍ التحقق...</p>
        ) : null}

        <button
          type="button"
          onClick={async () => { setPin(""); setError(""); setSendingOtp(true); await sendOtp(); setSendingOtp(false); }}
          disabled={sendingOtp}
          className="w-full text-center text-sm text-sky-600 dark:text-sky-300 transition hover:text-sky-700 dark:hover:text-sky-200 hover:underline disabled:cursor-wait disabled:opacity-50"
        >
          {sendingOtp ? "جارٍ إرسال كود التحقق..." : "نسيت الـ PIN؟ — ادخل برمز OTP بدلاً منه"}
        </button>

        <button
          type="button"
          onClick={() => { setStep("phone"); setPin(""); setError(""); }}
          className="w-full text-center text-sm text-slate-400 dark:text-[#94A3B8] transition hover:text-slate-600 dark:hover:text-white"
        >
          ← تغيير رقم الهاتف
        </button>
      </CardContent>

      <div id="recaptcha-container-login" ref={recaptchaContainerRef} />
    </Card>
  );
}
