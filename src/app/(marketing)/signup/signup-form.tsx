'use client';

import Link from "next/link";
import { ArrowLeft, CircleAlert, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkSubdomainAvailability, createTeacherSignup } from "@/modules/marketing/actions";
import { confirmFirebasePhoneOtp, resetFirebasePhoneOtp, sendFirebasePhoneOtp } from "@/modules/auth/lib/firebasePhoneOtp";

type FormState = {
  teacherName: string;
  phone: string;
  subject: string;
  governorate: string;
  subdomain: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const OTP_LENGTH = 6;
const OTP_RESEND_SECONDS = 60;
const RECAPTCHA_CONTAINER_ID = "teacher-signup-firebase-recaptcha";

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.teacherName.trim().length < 3) errors.teacherName = "يرجى إدخال اسم المدرس كاملًا بحد أدنى 3 أحرف";
  if (!/^01\d{9}$/.test(form.phone)) errors.phone = "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01";
  if (form.subject.trim().length < 1) errors.subject = "يرجى إدخال المادة الدراسية";
  if (form.governorate.trim().length < 2) errors.governorate = "يرجى إدخال المحافظة";
  if (!/^[a-z0-9-]{3,20}$/.test(form.subdomain.trim())) {
    errors.subdomain = "يجب أن يكون رابط الحساب بين 3 و20 حرفًا (a-z, 0-9, -)";
  }
  return errors;
}

export function SignupForm({ initialPhone }: { initialPhone?: string }) {
  const [form, setForm] = useState<FormState>({
    teacherName: "",
    phone: initialPhone ?? "",
    subject: "",
    governorate: "",
    subdomain: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedIdToken, setVerifiedIdToken] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [subdomainState, setSubdomainState] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [subdomainMessage, setSubdomainMessage] = useState("");

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
    if (!pageSuccess) return;
    const timer = window.setTimeout(() => window.location.assign("/teacher"), 1200);
    return () => window.clearTimeout(timer);
  }, [pageSuccess]);

  useEffect(() => {
    const errs = validateForm(form);
    if (errs.phone || !form.phone || otpSent || phoneVerified || autoSendKeyRef.current === form.phone) return;
    autoSendKeyRef.current = form.phone;
    handleSendOtp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone, otpSent, phoneVerified]);

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
    setPageSuccess("");
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === "phone") resetOtpState();
    if (field === "subdomain") {
      setSubdomainState("idle");
      setSubdomainMessage("");
    }
  };

  const handleSubdomainCheck = () => {
    const value = form.subdomain.trim().toLowerCase();
    if (!value) return;
    if (!/^[a-z0-9-]{3,20}$/.test(value)) return;

    setSubdomainState("checking");
    setSubdomainMessage("");

    startCreating(async () => {
      const result = await checkSubdomainAvailability(value);
      if (result.available) {
        setSubdomainState("available");
        setSubdomainMessage("الرابط متاح");
      } else {
        setSubdomainState("taken");
        setSubdomainMessage(result.message ?? "الرابط غير متاح");
      }
    });
  };

  const handleSendOtp = (force = false) => {
    const errs = validateForm(form);
    setErrors(errs);
    setPageError("");
    setOtpError("");
    if (errs.phone) return;
    if (secondsLeft > 0 && otpSent && !force) return;

    startSendingOtp(async () => {
      const result = await sendFirebasePhoneOtp(form.phone, RECAPTCHA_CONTAINER_ID);
      if (!result.success) {
        setPageError(result.message ?? "تعذر إرسال كود التحقق");
        return;
      }
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
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("يرجى إدخال كود تحقق مكوّن من 6 أرقام");
      return;
    }

    startVerifyingOtp(async () => {
      const result = await confirmFirebasePhoneOtp(otpCode);
      if (!result.success || !result.idToken) {
        setOtpError(result.message ?? "كود التحقق غير صحيح");
        return;
      }
      if (result.normalizedPhone !== form.phone) {
        setOtpError("رقم الهاتف الموثق لا يطابق الرقم المدخل");
        return;
      }
      setPhoneVerified(true);
      setVerifiedIdToken(result.idToken);
    });
  };

  const handleCreateAccount = () => {
    const normalizedSubdomain = form.subdomain.trim().toLowerCase();
    const payload = { ...form, subdomain: normalizedSubdomain };
    const errs = validateForm(payload);
    setErrors(errs);
    setPageError("");

    if (Object.keys(errs).length > 0) return;
    if (!phoneVerified || !verifiedIdToken) {
      setPageError("يجب التحقق من رقم الهاتف أولًا");
      return;
    }
    if (subdomainState === "taken") {
      setPageError(subdomainMessage || "الرابط غير متاح");
      return;
    }

    startCreating(async () => {
      const result = await createTeacherSignup({
        teacherName: payload.teacherName,
        phone: payload.phone,
        subject: payload.subject,
        governorate: payload.governorate,
        subdomain: payload.subdomain,
        idToken: verifiedIdToken,
      });

      if (!result.success) {
        setPageError(result.message ?? "تعذر إنشاء الحساب");
        return;
      }

      setPageSuccess(result.message ?? "تم إنشاء الحساب بنجاح");
    });
  };

  return (
    <Card className="w-full overflow-hidden rounded-[28px] border-white/10 bg-slate-950/85 font-[Cairo] text-white shadow-[0_24px_80px_rgba(15,23,42,0.4)] backdrop-blur">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,_rgba(22,59,84,0.96),_rgba(26,82,118,0.98)_45%,_rgba(46,134,193,0.92))] px-6 py-7 sm:px-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">إنشاء حساب معلم</h1>
        <p className="mt-2 text-sm leading-7 text-white/80">ابدأ حسابك وفعّل منصتك برابط خاص بك.</p>
      </div>

      <CardContent className="space-y-5 p-6 sm:p-8">
        {pageError ? (
          <div className="flex items-start gap-3 rounded-[18px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-start leading-7">{pageError}</p>
          </div>
        ) : null}
        {pageSuccess ? (
          <div className="rounded-[18px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {pageSuccess}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="teacherName">اسم المدرس</Label>
          <Input id="teacherName" value={form.teacherName} onChange={(e) => updateField("teacherName", e.target.value)} placeholder="مثال: أحمد محمد علي" className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500" />
          {errors.teacherName ? <p className="text-sm text-rose-300">{errors.teacherName}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="subject">المادة</Label>
            <Input id="subject" value={form.subject} onChange={(e) => updateField("subject", e.target.value)} placeholder="رياضيات" className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500" />
            {errors.subject ? <p className="text-sm text-rose-300">{errors.subject}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="governorate">المحافظة</Label>
            <Input id="governorate" value={form.governorate} onChange={(e) => updateField("governorate", e.target.value)} placeholder="القاهرة" className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500" />
            {errors.governorate ? <p className="text-sm text-rose-300">{errors.governorate}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subdomain">رابط الحساب (Subdomain)</Label>
          <Input id="subdomain" dir="ltr" value={form.subdomain} onChange={(e) => updateField("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} onBlur={handleSubdomainCheck} placeholder="ahmed-math" className="min-h-11 border-white/10 bg-slate-900/80 text-base font-semibold text-white placeholder:text-slate-500" />
          {errors.subdomain ? <p className="text-sm text-rose-300">{errors.subdomain}</p> : null}
          {subdomainState === "checking" ? <p className="text-sm text-sky-300">جارٍ التحقق من الرابط...</p> : null}
          {subdomainState === "available" ? <p className="text-sm text-emerald-300">{subdomainMessage}</p> : null}
          {subdomainState === "taken" ? <p className="text-sm text-rose-300">{subdomainMessage}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input id="phone" dir="ltr" inputMode="numeric" maxLength={11} value={form.phone} onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))} placeholder="01XXXXXXXXX" className="min-h-11 border-white/10 bg-slate-900/80 text-base font-semibold text-white placeholder:text-slate-500" />
          {errors.phone ? <p className="text-sm text-rose-300">{errors.phone}</p> : null}
        </div>

        <div className="rounded-[22px] border border-white/10 bg-slate-900/60 p-5 space-y-4">
          <div id={RECAPTCHA_CONTAINER_ID} />
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${phoneVerified ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-sm">{phoneVerified ? "تم التحقق من رقم الهاتف" : "التحقق من رقم الهاتف"}</p>
          </div>

          {!phoneVerified ? (
            <>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm">
                {isSendingOtp && !otpSent ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-sky-300"><Loader2 className="h-4 w-4 animate-spin" />جارٍ إرسال الكود...</span>
                ) : otpSent && secondsLeft > 0 ? (
                  <span className="font-semibold text-slate-300">يمكنك إعادة الإرسال بعد <span dir="ltr">{secondsLeft}</span> ثانية</span>
                ) : (
                  <button type="button" disabled={isSendingOtp} onClick={() => handleSendOtp(true)} className="inline-flex items-center gap-2 font-bold text-sky-300 transition hover:text-sky-200 disabled:opacity-50">
                    <RefreshCw className="h-4 w-4" />
                    {otpSent ? "إعادة إرسال الكود" : "إرسال الكود"}
                  </button>
                )}
              </div>

              {otpError ? <p className="text-sm text-rose-300">{otpError}</p> : null}

              {otpSent ? (
                <div className="space-y-3">
                  <Input dir="ltr" inputMode="numeric" maxLength={OTP_LENGTH} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))} placeholder="123456" className="min-h-11 border-white/10 bg-slate-900/80 text-base font-semibold text-white placeholder:text-slate-500" />
                  <Button type="button" className="w-full min-h-11" disabled={isVerifyingOtp} onClick={handleVerifyOtp}>
                    {isVerifyingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />جارٍ التحقق...</> : "تأكيد الكود"}
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <Button type="button" className="min-h-11 w-full text-base font-bold" disabled={isCreating || !phoneVerified} onClick={handleCreateAccount}>
          {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />جارٍ إنشاء الحساب...</> : "إنشاء حساب معلم ←"}
        </Button>

        <div className="border-t border-white/10 pt-4 text-center">
          <p className="text-sm text-slate-400">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-bold text-sky-300 transition hover:text-sky-200 hover:underline">
              سجل الدخول
              <ArrowLeft className="inline-block ms-1 h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

