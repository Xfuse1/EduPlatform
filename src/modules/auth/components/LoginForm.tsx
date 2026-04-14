'use client';

import { ArrowLeft, Delete, Phone } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
                ? "scale-110 border-sky-400 bg-sky-400"
                : "border-slate-500 bg-transparent"
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
                className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-bold text-white transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
export function LoginForm({ tenant }: { tenant: TenantSummary }) {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [actualTenantId, setActualTenantId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
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
      const { hasPin, exists, actualTenantId: tid } = await checkUserPin(phone);

      if (!exists) {
        setError("لا يوجد حساب مرتبط بهذا الرقم");
        return;
      }

      if (tid) setActualTenantId(tid);

      if (hasPin) {
        setStep("pin");
        return;
      }

      // No PIN → go OTP flow (pass tid directly, don't rely on state update)
      await sendOtp(tid);
    });
  };

  const sendOtp = async (tenantId?: string) => {
    try {
      const { sendFirebasePhoneOtp } = await import("@/modules/auth/lib/firebasePhoneOtp");
      const result = await sendFirebasePhoneOtp(phone, "recaptcha-container-login");

      if (!result.success) {
        setError(result.message ?? "تعذر إرسال كود التحقق");
        return;
      }

      const verifyUrl = `/verify?phone=${encodeURIComponent(phone)}${tenantId ? `&tenantId=${encodeURIComponent(tenantId)}` : ""}`;
      router.push(verifyUrl);
    } catch (err) {
      console.error("[LoginForm] sendOTP failed:", err);
      setError("تعذر إرسال كود التحقق. تأكد من رقم الهاتف وحاول مرة أخرى.");
    }
  };

  const handlePinSubmit = (currentPin: string) => {
    if (currentPin.length < PIN_MIN_LENGTH) return;

    setError("");

    startTransition(async () => {
      const result = await verifyPinAction(phone, currentPin, actualTenantId);
      if (!result.success) {
        setError(result.message ?? "الـ PIN غير صحيح");
        setPin("");
        return;
      }
      window.location.replace(result.redirectTo ?? "/teacher");
    });
  };

  // ─── Phone Step ─────────────────────────────────────────────────────────────
  if (step === "phone") {
    return (
      <Card className="overflow-hidden rounded-[24px] border-white/30 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div
          className="relative overflow-hidden px-6 pb-7 pt-8 sm:px-8"
          // eslint-disable-next-line react/forbid-component-props
          style={{ background: `linear-gradient(135deg, ${tenant.themeColor}, #2E86C1 55%, #6FB3D2)` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_32%)]" />
          <div className="relative text-center text-white">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white/15 text-3xl font-extrabold shadow-lg backdrop-blur">
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={tenant.name} className="h-full w-full rounded-full object-cover" src={tenant.logoUrl} />
              ) : (
                getInitials(tenant.name)
              )}
            </div>
            <h1 className="mt-5 text-3xl font-extrabold">منصة EduPlatform</h1>
            <p className="mt-3 text-sm leading-7 text-white/90">سجّل الدخول برقم الهاتف.</p>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8">
          <form className="space-y-5" onSubmit={handlePhoneSubmit}>
            <div>
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-lg">🇪🇬</span>
                <span className="pointer-events-none absolute inset-y-0 start-14 flex items-center text-slate-400 dark:text-slate-500">
                  <Phone className="h-4 w-4" />
                </span>
                <Input
                  dir="ltr"
                  id="phone"
                  inputMode="numeric"
                  maxLength={11}
                  name="phone"
                  onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  className="ps-24 text-base font-semibold"
                />
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                يجب أن يبدأ الرقم بـ <span dir="ltr">01</span> ويتكون من <span dir="ltr">11</span> رقماً.
              </p>
            </div>

            {error ? (
              <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            <Button className="w-full gap-2 text-base" disabled={isPending} type="submit">
              <span>{isPending ? "جارٍ التحقق..." : "متابعة"}</span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <div className="border-t border-slate-100 px-6 py-4 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          منصة EduPlatform
        </div>

        <div id="recaptcha-container-login" ref={recaptchaContainerRef} />
      </Card>
    );
  }

  // ─── PIN Step ────────────────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden rounded-[24px] border-white/10 bg-slate-950/85 text-white backdrop-blur">
      <div
        className="relative overflow-hidden px-6 pb-6 pt-7 sm:px-8"
        style={{ background: `linear-gradient(135deg, ${tenant.themeColor}, #2E86C1 55%, #6FB3D2)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_32%)]" />
        <div className="relative text-center text-white">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/15 text-2xl font-extrabold shadow-lg backdrop-blur">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={tenant.name} className="h-full w-full rounded-full object-cover" src={tenant.logoUrl} />
            ) : (
              getInitials(tenant.name)
            )}
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">منصة EduPlatform</h1>
          <p className="mt-2 text-sm text-white/80">
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

        <Button className="w-full text-base" disabled={isPending || pin.length < PIN_MIN_LENGTH} onClick={() => handlePinSubmit(pin)} type="button">
          متابعة
        </Button>

        {isPending ? (
          <p className="text-center text-sm text-slate-400">جارٍ التحقق...</p>
        ) : null}

        <button
          type="button"
          onClick={async () => { setStep("phone"); setPin(""); setError(""); await sendOtp(actualTenantId); }}
          className="w-full text-center text-sm text-sky-300 transition hover:text-sky-200 hover:underline"
        >
          نسيت الـ PIN؟ — ادخل برمز OTP بدلاً منه
        </button>

        <button
          type="button"
          onClick={() => { setStep("phone"); setPin(""); setError(""); }}
          className="w-full text-center text-sm text-slate-400 transition hover:text-slate-300"
        >
          ← تغيير رقم الهاتف
        </button>
      </CardContent>
    </Card>
  );
}
