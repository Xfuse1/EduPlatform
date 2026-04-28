'use client';

import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeEgyptPhone } from "@/lib/phone";
import { setPinWithOtpAction } from "@/modules/auth/pin-actions";
import {
  confirmFirebasePhoneOtp,
  resetFirebasePhoneOtp,
  sendFirebasePhoneOtp,
} from "@/modules/auth/lib/firebasePhoneOtp";

type PinSettingsCardProps = {
  phone: string | null;
  hasPin: boolean;
};

type Step = "idle" | "otp-sent" | "verified";

export function PinSettingsCard({ phone, hasPin }: PinSettingsCardProps) {
  const router = useRouter();
  const recaptchaId = `pin-settings-recaptcha-${useId().replace(/:/g, "")}`;
  const [step, setStep] = useState<Step>("idle");
  const [otpCode, setOtpCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [idToken, setIdToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [localHasPin, setLocalHasPin] = useState(hasPin);
  const normalizedPhone = phone ? normalizeEgyptPhone(phone) : "";

  useEffect(() => {
    return () => {
      void resetFirebasePhoneOtp();
    };
  }, []);

  const canUsePhoneOtp = /^01\d{9}$/.test(normalizedPhone);

  async function handleSendOtp() {
    setError("");
    setMessage("");

    if (!normalizedPhone || !canUsePhoneOtp) {
      setError("لا يوجد رقم هاتف مصري صالح لهذا الحساب.");
      return;
    }

    setIsOtpLoading(true);
    const result = await sendFirebasePhoneOtp(normalizedPhone, recaptchaId);
    setIsOtpLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setStep("otp-sent");
    setMessage(result.message);
  }

  async function handleVerifyOtp() {
    setError("");
    setMessage("");

    if (otpCode.trim().length < 4) {
      setError("أدخل كود التحقق أولا.");
      return;
    }

    setIsOtpLoading(true);
    const result = await confirmFirebasePhoneOtp(otpCode.trim());
    setIsOtpLoading(false);

    if (!result.success || !result.idToken) {
      setError(result.message);
      return;
    }

    setIdToken(result.idToken);
    setStep("verified");
    setMessage("تم التحقق من رقم الهاتف. أدخل PIN جديد.");
  }

  function handleSavePin() {
    setError("");
    setMessage("");

    if (!/^\d{4,8}$/.test(pin)) {
      setError("الـ PIN يجب أن يكون من 4 إلى 8 أرقام.");
      return;
    }

    if (pin !== confirmPin) {
      setError("تأكيد الـ PIN غير مطابق.");
      return;
    }

    if (!idToken) {
      setError("يجب التحقق من رقم الهاتف أولا.");
      return;
    }

    startSaving(async () => {
      const result = await setPinWithOtpAction({ idToken, pin });

      if (!result.success) {
        setError(result.message ?? "تعذر حفظ الـ PIN.");
        return;
      }

      setLocalHasPin(true);
      setStep("idle");
      setOtpCode("");
      setPin("");
      setConfirmPin("");
      setIdToken("");
      setMessage(result.message ?? "تم حفظ الـ PIN بنجاح.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
            <KeyRound className="h-5 w-5" />
          </span>
          PIN الدخول السريع
        </CardTitle>
        <CardDescription>
          إضافة أو تغيير PIN يتم بعد كود تحقق على رقم هاتف حسابك الحالي.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-slate-900 dark:text-white">
              الحالة: {localHasPin ? "مفعل" : "غير مفعل"}
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-400" dir="ltr">
              {normalizedPhone || "لا يوجد رقم هاتف"}
            </p>
          </div>
          <Button className="gap-2" type="button" onClick={handleSendOtp} disabled={!canUsePhoneOtp || isOtpLoading || isSaving}>
            {isOtpLoading && step === "idle" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {localHasPin ? "تغيير PIN" : "إضافة PIN"}
          </Button>
        </div>

        <div id={recaptchaId} />

        {step === "otp-sent" && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <Label htmlFor="pin-otp-code">كود التحقق</Label>
              <Input
                id="pin-otp-code"
                dir="ltr"
                inputMode="numeric"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
            </div>
            <Button className="self-end" type="button" onClick={handleVerifyOtp} disabled={isOtpLoading}>
              {isOtpLoading ? "جاري التحقق..." : "تأكيد الكود"}
            </Button>
          </div>
        )}

        {step === "verified" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-pin">PIN جديد</Label>
              <Input
                id="new-pin"
                dir="ltr"
                inputMode="numeric"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="4 إلى 8 أرقام"
              />
            </div>
            <div>
              <Label htmlFor="confirm-pin">تأكيد PIN</Label>
              <Input
                id="confirm-pin"
                dir="ltr"
                inputMode="numeric"
                type="password"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="أعد إدخال الـ PIN"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="button" onClick={handleSavePin} disabled={isSaving}>
                {isSaving ? "جاري الحفظ..." : "حفظ PIN"}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
