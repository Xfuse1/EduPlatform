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

export function ParentRegisterLauncher({ initialPhone, tenantSlug, tenantName }: { initialPhone?: string; tenantSlug?: string; tenantName?: string }) {
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
    <Card 
      className="overflow-hidden border-slate-200 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/5 dark:shadow-[0_0_60px_rgba(0,184,160,0.08)] rounded-[20px]"
    >
        <CardContent className="flex flex-col items-center gap-5 p-5 text-center sm:gap-6 sm:p-10">
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
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#00B8A0,#1A2B6D)] px-4 py-3 text-base font-bold text-white transition hover:bg-[linear-gradient(135deg,#00c4ab,#1e3480)]"
          >
            ادخل إلى حسابك ←
          </a>
        </CardContent>
      </Card>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────────
  return (
    <Card 
      className="w-full overflow-hidden border-slate-200 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/5 dark:shadow-[0_0_60px_rgba(0,184,160,0.08)] rounded-[20px]"
    >
      <div className="border-b border-slate-100 px-4 py-6 text-center dark:border-white/5 sm:px-8 sm:py-7">
        <div className="mx-auto mb-4 flex h-[48px] w-[48px] items-center justify-center">
          <img alt="Logo" className="h-full w-full object-contain" src="/images/logo.svg" />
        </div>
        <h1 className="text-2xl font-extrabold sm:text-3xl text-slate-900 dark:text-white">
          أنشئ حساب ولي الأمر {tenantName ? ` لدى ${tenantName}` : ""}
        </h1>
        <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-[#94A3B8]">
          سجّل برقم هاتفك وتابع أبناءك بكل سهولة
        </p>
      </div>

      <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-8">
        {pageError ? (
          <div className="flex items-start gap-3 rounded-[18px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-start leading-7">{pageError}</p>
          </div>
        ) : null}

        {/* Name */}
        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-white" htmlFor="parentName">اسم ولي الأمر</Label>
          <Input
            id="parentName"
            placeholder="مثال: أحمد محمد علي"
            value={form.parentName}
            onChange={(e) => updateField("parentName", e.target.value)}
            className="min-h-11 bg-slate-100/50 border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-[10px] text-slate-900 dark:text-white focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0]"
          />
          {errors.parentName ? <p className="text-sm text-rose-300">{errors.parentName}</p> : null}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-white" htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            dir="ltr"
            inputMode="numeric"
            maxLength={11}
            placeholder="01XXXXXXXXX"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
            className="min-h-11 bg-slate-100/50 border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-[10px] text-slate-900 dark:text-white focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0] font-semibold"
          />
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">سيكون هذا الرقم هو وسيلة الدخول إلى حسابك.</p>
          {errors.phone ? <p className="text-sm text-rose-300">{errors.phone}</p> : null}
        </div>

        {/* OTP section */}
        <div className="rounded-[22px] border border-slate-200 bg-slate-100/30 dark:border-white/10 dark:bg-slate-900/60 p-5 space-y-4">
          <div id={RECAPTCHA_CONTAINER_ID} />

          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${phoneVerified ? "bg-emerald-500/20 text-emerald-300" : "bg-[#00B8A0]/15 text-[#00B8A0]"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {phoneVerified ? "✅ تم التحقق من رقم الهاتف" : "التحقق من رقم الهاتف"}
              </p>
              <p className="text-xs leading-6 text-slate-500 dark:text-[#94A3B8]">
                {phoneVerified ? "يمكنك الآن إنشاء الحساب." : "سيتم إرسال كود التحقق تلقائيًا بعد إدخال رقمك."}
              </p>
            </div>
          </div>

          {!phoneVerified ? (
            <>
              {/* Resend / status */}
              <div className="rounded-xl border border-slate-200 bg-slate-100/50 dark:border-white/10 dark:bg-slate-950/40 px-4 py-3 text-sm">
                {isSendingOtp && !otpSent ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-sky-500 dark:text-sky-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ إرسال كود التحقق...
                  </span>
                ) : otpSent && secondsLeft > 0 ? (
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    يمكنك إعادة الإرسال بعد <span dir="ltr">{secondsLeft}</span> ثانية
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isSendingOtp}
                    onClick={() => handleSendOtp(true)}
                    className="inline-flex items-center gap-2 font-bold text-[#00B8A0] transition hover:text-[#00c4ab] disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {otpSent ? "إعادة إرسال الكود" : "إرسال الكود يدويًا"}
                  </button>
                )}
              </div>

              {otpError ? <p className="text-sm text-rose-600 dark:text-rose-300">{otpError}</p> : null}

              {otpSent ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-white" htmlFor="otp-code">كود التحقق</Label>
                    <Input
                      id="otp-code"
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={OTP_LENGTH}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                      className="min-h-11 bg-slate-100/50 border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-[10px] text-slate-900 dark:text-white focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0] font-semibold"
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full min-h-11 rounded-[10px] bg-[linear-gradient(135deg,#00B8A0,#1A2B6D)] hover:bg-[linear-gradient(135deg,#00c4ab,#1e3480)] hover:-translate-y-[1px] transition-all text-white border-0"
                    disabled={isVerifyingOtp}
                    onClick={handleVerifyOtp}
                  >
                    {isVerifyingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />جارٍ التحقق...</> : "تأكيد الكود"}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
              تم ربط هذا الطلب برقم <span className="font-bold" dir="ltr">{form.phone}</span>
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          type="button"
          className="min-h-11 w-full text-base font-bold rounded-[10px] bg-[linear-gradient(135deg,#00B8A0,#1A2B6D)] hover:bg-[linear-gradient(135deg,#00c4ab,#1e3480)] hover:-translate-y-[1px] transition-all text-white border-0"
          disabled={isCreating || !phoneVerified}
          onClick={handleCreateAccount}
        >
          {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />جارٍ إنشاء الحساب...</> : "إنشاء حساب ولي الأمر ←"}
        </Button>

        {/* Login link */}
        <div className="border-t border-slate-100 dark:border-white/10 pt-4 text-center">
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
            لديك حساب بالفعل؟{" "}
            <Link href={tenantSlug ? `/${tenantSlug}/login` : "/login"} className="font-bold text-[#00B8A0] transition hover:text-[#00c4ab] hover:underline">
              سجّل الدخول
              <ArrowLeft className="inline-block ms-1 h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
