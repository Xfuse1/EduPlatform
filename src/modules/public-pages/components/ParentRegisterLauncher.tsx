'use client';

import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createParentSignup } from "@/modules/marketing/actions";
import { confirmFirebasePhoneOtp, resetFirebasePhoneOtp, sendFirebasePhoneOtp } from "@/modules/auth/lib/firebasePhoneOtp";

type FormState = {
  parentName: string;
  phone: string;
};

type FormErrors = {
  parentName?: string;
  phone?: string;
};

type ResolvedAccount = {
  kind: "created" | "existing";
  accessUrl: string;
  redirectTo: string;
  message: string;
  tenantName: string;
};

const OTP_LENGTH = 6;
const OTP_RESEND_SECONDS = 60;
const RECAPTCHA_CONTAINER_ID = "parent-signup-firebase-recaptcha";

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.parentName.trim().length < 3) errors.parentName = "يرجى إدخال اسم ولي الأمر كاملًا بحد أدنى 3 أحرف";
  if (!/^01\d{9}$/.test(form.phone)) errors.phone = "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01";
  return errors;
}

export function ParentRegisterLauncher({ initialPhone }: { initialPhone?: string }) {
  const [form, setForm] = useState<FormState>({ parentName: "", phone: initialPhone ?? "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [pageError, setPageError] = useState("");
  const [resolvedAccount, setResolvedAccount] = useState<ResolvedAccount | null>(null);

  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedIdToken, setVerifiedIdToken] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [isSendingOtp, startSendingOtp] = useTransition();
  const [isVerifyingOtp, startVerifyingOtp] = useTransition();
  const [isCreating, startCreating] = useTransition();
  const autoSendKeyRef = useRef("");

  useEffect(() => {
    if (!otpSent || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [otpSent, secondsLeft]);

  useEffect(() => () => { void resetFirebasePhoneOtp(); }, []);

  useEffect(() => {
    if (!resolvedAccount) return;
    const timer = window.setTimeout(() => window.location.assign(resolvedAccount.redirectTo), 1500);
    return () => window.clearTimeout(timer);
  }, [resolvedAccount]);

  useEffect(() => {
    const errs = validateForm(form);
    if (errs.phone || errs.parentName || !form.phone || otpSent || phoneVerified || autoSendKeyRef.current === form.phone) return;
    autoSendKeyRef.current = form.phone;
    handleSendOtp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, otpSent, phoneVerified]);

  const resetOtpState = () => {
    autoSendKeyRef.current = "";
    setOtpCode("");
    setOtpError("");
    setOtpSent(false);
    setPhoneVerified(false);
    setVerifiedIdToken("");
    setSecondsLeft(0);
    void resetFirebasePhoneOtp();
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setPageError("");
    setResolvedAccount(null);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === "phone") resetOtpState();
  };

  const handleSendOtp = (force = false) => {
    const errs = validateForm(form);
    setErrors(errs);
    setPageError("");
    setOtpError("");
    if (errs.phone || errs.parentName) return;
    if (secondsLeft > 0 && otpSent && !force) return;

    startSendingOtp(async () => {
      const result = await sendFirebasePhoneOtp(form.phone, RECAPTCHA_CONTAINER_ID);
      if (!result.success) { setPageError(result.message ?? "تعذر إرسال كود التحقق"); return; }
      setOtpSent(true);
      setPhoneVerified(false);
      setVerifiedIdToken("");
      setOtpCode("");
      setSecondsLeft(OTP_RESEND_SECONDS);
    });
  };

  const handleVerifyOtp = () => {
    setPageError("");
    setOtpError("");
    if (!/^\d{6}$/.test(otpCode)) { setOtpError("يرجى إدخال كود تحقق مكوّن من 6 أرقام"); return; }

    startVerifyingOtp(async () => {
      const result = await confirmFirebasePhoneOtp(otpCode);
      if (!result.success || !result.idToken) { setOtpError(result.message ?? "كود التحقق غير صحيح"); return; }
      if (result.normalizedPhone !== form.phone) { setOtpError("رقم الهاتف الموثق لا يطابق الرقم المدخل"); return; }
      setPhoneVerified(true);
      setVerifiedIdToken(result.idToken);
    });
  };

  const handleCreateAccount = () => {
    const errs = validateForm(form);
    setErrors(errs);
    setPageError("");
    if (Object.keys(errs).length > 0) return;
    if (!phoneVerified || !verifiedIdToken) { setPageError("يجب التحقق من رقم الهاتف أولًا"); return; }

    startCreating(async () => {
      const result = await createParentSignup({ parentName: form.parentName, phone: form.phone, idToken: verifiedIdToken });
      if (result.redirectTo && result.accessUrl && result.tenantName) {
        setResolvedAccount({ kind: result.success ? "created" : "existing", accessUrl: result.accessUrl, redirectTo: result.redirectTo, message: result.message ?? "", tenantName: result.tenantName });
        return;
      }
      if (!result.success) { setPageError(result.message ?? "تعذر إنشاء الحساب"); return; }
      setPageError("تم الإنشاء لكن تعذر تجهيز رابط الدخول");
    });
  };

  // ─── Success screen ───────────────────────────────────────────────────────
  if (resolvedAccount) {
    return (
      <Card className="overflow-hidden rounded-[28px] border-white/10 bg-slate-950/85 text-white shadow-[0_24px_80px_rgba(15,23,42,0.4)] backdrop-blur">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:p-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              {resolvedAccount.kind === "created" ? "🎉 تم إنشاء حسابك!" : "الحساب موجود بالفعل"}
            </h2>
            <p className="text-sm leading-7 text-slate-300">{resolvedAccount.message}</p>
          </div>
          <div className="w-full rounded-[18px] border border-white/10 bg-slate-900/70 px-5 py-4 text-start space-y-2">
            <p className="text-sm text-slate-400">اسم الحساب</p>
            <p className="font-bold text-white">{resolvedAccount.tenantName}</p>
            <p className="text-sm text-slate-400 mt-2">رابط الدخول</p>
            <p className="font-bold text-sky-300 text-sm" dir="ltr">{resolvedAccount.accessUrl}</p>
          </div>
          <p className="text-sm text-slate-400">جارٍ تحويلك تلقائيًا...</p>
          <a
            href={resolvedAccount.redirectTo}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-base font-bold text-white transition hover:bg-secondary"
          >
            ادخل إلى حسابك ←
          </a>
        </CardContent>
      </Card>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────
  return (
    <Card className="w-full overflow-hidden rounded-[28px] border-white/10 bg-slate-950/85 font-[Cairo] text-white shadow-[0_24px_80px_rgba(15,23,42,0.4)] backdrop-blur">
      {/* Header */}
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,_rgba(22,59,84,0.96),_rgba(26,82,118,0.98)_45%,_rgba(46,134,193,0.92))] px-6 py-7 sm:px-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">أنشئ حساب ولي الأمر</h1>
        <p className="mt-2 text-sm leading-7 text-white/80">
          سجّل برقم هاتفك وتابع أبناءك بكل سهولة
        </p>
      </div>

      <CardContent className="space-y-6 p-6 sm:p-8">
        {pageError ? (
          <div className="flex items-start gap-3 rounded-[18px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-start leading-7">{pageError}</p>
          </div>
        ) : null}

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="parentName">اسم ولي الأمر</Label>
          <Input
            id="parentName"
            placeholder="مثال: أحمد محمد علي"
            value={form.parentName}
            onChange={(e) => updateField("parentName", e.target.value)}
            className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500"
          />
          {errors.parentName ? <p className="text-sm text-rose-300">{errors.parentName}</p> : null}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            dir="ltr"
            inputMode="numeric"
            maxLength={11}
            placeholder="01XXXXXXXXX"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
            className="min-h-11 border-white/10 bg-slate-900/80 text-base font-semibold text-white placeholder:text-slate-500"
          />
          <p className="text-sm text-slate-400">سيكون هذا الرقم هو وسيلة الدخول إلى حسابك.</p>
          {errors.phone ? <p className="text-sm text-rose-300">{errors.phone}</p> : null}
        </div>

        {/* OTP section */}
        <div className="rounded-[22px] border border-white/10 bg-slate-900/60 p-5 space-y-4">
          <div id={RECAPTCHA_CONTAINER_ID} />

          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${phoneVerified ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">
                {phoneVerified ? "✅ تم التحقق من رقم الهاتف" : "التحقق من رقم الهاتف"}
              </p>
              <p className="text-xs leading-6 text-slate-400">
                {phoneVerified ? "يمكنك الآن إنشاء الحساب." : "سيتم إرسال كود التحقق تلقائيًا بعد إدخال رقمك."}
              </p>
            </div>
          </div>

          {!phoneVerified ? (
            <>
              {/* Resend / status */}
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm">
                {isSendingOtp && !otpSent ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-sky-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ إرسال كود التحقق...
                  </span>
                ) : otpSent && secondsLeft > 0 ? (
                  <span className="font-semibold text-slate-300">
                    يمكنك إعادة الإرسال بعد <span dir="ltr">{secondsLeft}</span> ثانية
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isSendingOtp}
                    onClick={() => handleSendOtp(true)}
                    className="inline-flex items-center gap-2 font-bold text-sky-300 transition hover:text-sky-200 disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {otpSent ? "إعادة إرسال الكود" : "إرسال الكود يدويًا"}
                  </button>
                )}
              </div>

              {otpError ? <p className="text-sm text-rose-300">{otpError}</p> : null}

              {otpSent ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">كود التحقق</Label>
                    <Input
                      id="otp-code"
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={OTP_LENGTH}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                      className="min-h-11 border-white/10 bg-slate-900/80 text-base font-semibold text-white placeholder:text-slate-500"
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full min-h-11"
                    disabled={isVerifyingOtp}
                    onClick={handleVerifyOtp}
                  >
                    {isVerifyingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />جارٍ التحقق...</> : "تأكيد الكود"}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              تم ربط هذا الطلب برقم <span className="font-bold" dir="ltr">{form.phone}</span>
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          type="button"
          className="min-h-11 w-full text-base font-bold"
          disabled={isCreating || !phoneVerified}
          onClick={handleCreateAccount}
        >
          {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />جارٍ إنشاء الحساب...</> : "إنشاء حساب ولي الأمر ←"}
        </Button>

        {/* Login link */}
        <div className="border-t border-white/10 pt-4 text-center">
          <p className="text-sm text-slate-400">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-bold text-sky-300 transition hover:text-sky-200 hover:underline">
              سجّل الدخول
              <ArrowLeft className="inline-block ms-1 h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
