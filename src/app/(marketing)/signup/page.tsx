'use client';

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeacherSignup } from "@/modules/marketing/actions";
import { confirmFirebasePhoneOtp, resetFirebasePhoneOtp, sendFirebasePhoneOtp } from "@/modules/auth/lib/firebasePhoneOtp";

type SignupStep = 1 | 2 | 3;
type AccountType = "CENTER" | "TEACHER";

type FormState = {
  accountType: AccountType;
  centerName: string;
  teacherName: string;
  phone: string;
  subject: string;
  governorate: string;
  subdomain: string;
};

type SuccessState = {
  loginUrl: string;
  message: string;
  tenantName: string;
  tenantSlug: string;
  accountType: AccountType;
};

type StepOneErrors = {
  centerName?: string;
  teacherName?: string;
  phone?: string;
  subject?: string;
  governorate?: string;
};

const RESERVED_SUBDOMAINS = new Set(["ahmed", "noor", "test", "admin", "www", "app"]);
const OTP_LENGTH = 6;
const OTP_RESEND_SECONDS = 60;
const RECAPTCHA_CONTAINER_ID = "teacher-signup-firebase-recaptcha";

const progressSteps = [
  { step: 1, number: "١", label: "البيانات" },
  { step: 2, number: "٢", label: "الرابط" },
  { step: 3, number: "٣", label: "التأكيد" },
] as const;

const accountTypeOptions: Array<{ value: AccountType; label: string }> = [
  { value: "CENTER", label: "سنتر" },
  { value: "TEACHER", label: "مدرس" },
];

function validateStepOne(form: FormState): StepOneErrors {
  const errors: StepOneErrors = {};

  if (form.accountType === "CENTER" && form.centerName.trim().length < 3) {
    errors.centerName = "يرجى إدخال اسم السنتر بحد أدنى 3 أحرف";
  }

  if (form.teacherName.trim().length < 3) {
    errors.teacherName = "يجب كتابة اسم المدرس كاملًا بحد أدنى 3 أحرف";
  }

  if (!/^01\d{9}$/.test(form.phone)) {
    errors.phone = "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01";
  }

  if (form.accountType === "TEACHER" && form.subject.trim().length < 2) {
    errors.subject = "يرجى إدخال المادة الدراسية";
  }

  if (form.governorate.trim().length < 2) {
    errors.governorate = "يرجى إدخال المحافظة";
  }

  return errors;
}

function getSubdomainError(subdomain: string) {
  const normalizedValue = subdomain.trim().toLowerCase();

  if (normalizedValue.length < 3 || normalizedValue.length > 20) {
    return "يجب أن يكون رابط الحساب بين 3 و20 حرفًا";
  }

  if (!/^[a-z0-9-]+$/.test(normalizedValue)) {
    return "يجب أن يحتوي الرابط على حروف إنجليزية وأرقام فقط";
  }

  if (RESERVED_SUBDOMAINS.has(normalizedValue)) {
    return "هذا الاسم غير متاح حاليًا";
  }

  return "";
}

function getProgressState(currentStep: SignupStep, itemStep: number, isCompleted: boolean) {
  if (isCompleted || itemStep < currentStep) {
    return "completed";
  }

  if (itemStep === currentStep) {
    return "active";
  }

  return "upcoming";
}

export default function TeacherSignupPage() {
  const [currentStep, setCurrentStep] = useState<SignupStep>(1);
  const [form, setForm] = useState<FormState>({
    accountType: "TEACHER",
    centerName: "",
    teacherName: "",
    phone: "",
    subject: "",
    governorate: "",
    subdomain: "",
  });
  const [stepOneErrors, setStepOneErrors] = useState<StepOneErrors>({});
  const [subdomainError, setSubdomainError] = useState("");
  const [pageError, setPageError] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedIdToken, setVerifiedIdToken] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [isSendingOtp, startSendingOtp] = useTransition();
  const [isVerifyingOtp, startVerifyingOtp] = useTransition();
  const [isCreating, startCreating] = useTransition();

  const isCenterAccount = form.accountType === "CENTER";
  const normalizedSubdomain = form.subdomain.trim().toLowerCase();
  const helperSubdomain = normalizedSubdomain || "your-center";
  const liveSubdomainError =
    normalizedSubdomain.length > 0 && !RESERVED_SUBDOMAINS.has(normalizedSubdomain) ? getSubdomainError(normalizedSubdomain) : "";
  const subdomainStatus =
    normalizedSubdomain.length === 0
      ? "idle"
      : getSubdomainError(normalizedSubdomain)
        ? RESERVED_SUBDOMAINS.has(normalizedSubdomain)
          ? "unavailable"
          : "invalid"
        : "available";

  const reviewItems = useMemo(
    () => [
      { label: "نوع الحساب", value: isCenterAccount ? "سنتر" : "مدرس" },
      ...(isCenterAccount ? [{ label: "اسم السنتر", value: form.centerName }] : []),
      { label: isCenterAccount ? "اسم المدرس المسؤول" : "اسم المدرس", value: form.teacherName },
      { label: "رقم الهاتف", value: form.phone },
      ...(!isCenterAccount ? [{ label: "المادة", value: form.subject }] : []),
      { label: "المحافظة", value: form.governorate },
      { label: "رابط الدخول", value: `${helperSubdomain}.localhost` },
    ],
    [form.centerName, form.governorate, form.phone, form.subject, form.teacherName, helperSubdomain, isCenterAccount],
  );

  useEffect(() => {
    if (!otpSent || secondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpSent, secondsLeft]);

  useEffect(() => {
    return () => {
      void resetFirebasePhoneOtp();
    };
  }, []);

  const resetPhoneVerificationState = () => {
    setOtpCode("");
    setOtpMessage("");
    setOtpError("");
    setOtpSent(false);
    setPhoneVerified(false);
    setVerifiedIdToken("");
    setSecondsLeft(0);
    void resetFirebasePhoneOtp();
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));

    setPageError("");

    if (field === "accountType") {
      setStepOneErrors((currentValue) => ({
        ...currentValue,
        centerName: undefined,
        subject: undefined,
      }));
    }

    if (field === "centerName" || field === "teacherName" || field === "phone" || field === "subject" || field === "governorate") {
      setStepOneErrors((currentValue) => ({
        ...currentValue,
        [field]: undefined,
      }));
    }

    if (field === "subdomain") {
      setSubdomainError("");
    }

    if (field === "phone") {
      resetPhoneVerificationState();
    }
  };

  const goToStepTwo = () => {
    const errors = validateStepOne(form);
    setStepOneErrors(errors);
    setPageError("");

    if (Object.keys(errors).length > 0) {
      return;
    }

    setCurrentStep(2);
  };

  const goToStepThree = () => {
    const error = getSubdomainError(form.subdomain);
    setSubdomainError(error);
    setPageError("");

    if (error) {
      return;
    }

    setCurrentStep(3);
  };

  const handleSendOtp = () => {
    if (secondsLeft > 0 && otpSent) {
      return;
    }

    setPageError("");
    setOtpError("");
    setOtpMessage("");

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
      setOtpMessage(result.message ?? "تم إرسال كود التحقق");
      setSecondsLeft(OTP_RESEND_SECONDS);
    });
  };

  const handleVerifyOtp = () => {
    setPageError("");
    setOtpError("");
    setOtpMessage("");

    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError("يرجى إدخال كود تحقق مكوّن من 6 أرقام");
      return;
    }

    startVerifyingOtp(async () => {
      const result = await confirmFirebasePhoneOtp(otpCode);

      if (!result.success || !result.idToken) {
        setOtpError(result.message ?? "تعذر التحقق من الكود");
        return;
      }

      if (result.normalizedPhone !== form.phone) {
        setOtpError("رقم الهاتف الموثق لا يطابق الرقم الذي أدخلته");
        return;
      }

      setPhoneVerified(true);
      setVerifiedIdToken(result.idToken);
      setOtpMessage(result.message ?? "تم التحقق من رقم الهاتف بنجاح");
      setOtpError("");
    });
  };

  const handleCreateAccount = () => {
    setPageError("");

    if (!phoneVerified || !verifiedIdToken) {
      setPageError("يجب التحقق من رقم الهاتف قبل إنشاء الحساب");
      return;
    }

    startCreating(async () => {
      const result = await createTeacherSignup({
        accountType: form.accountType,
        centerName: form.centerName,
        teacherName: form.teacherName,
        phone: form.phone,
        subject: form.subject,
        governorate: form.governorate,
        subdomain: normalizedSubdomain,
        idToken: verifiedIdToken,
      });

      if (!result.success || !result.loginUrl || !result.tenantName || !result.tenantSlug || !result.accountType) {
        setPageError(result.message ?? "تعذر إنشاء الحساب");
        return;
      }

      setSuccess({
        loginUrl: result.loginUrl,
        message: result.message,
        tenantName: result.tenantName,
        tenantSlug: result.tenantSlug,
        accountType: result.accountType,
      });
    });
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.22),_transparent_30%),linear-gradient(145deg,_#0f2740_0%,_#1A5276_45%,_#dbeafe_120%)] px-4 py-8 sm:px-6"
      dir="rtl"
    >
      <Card className="w-full max-w-[520px] overflow-hidden rounded-[28px] border-white/10 bg-slate-950/85 font-[Cairo] text-white shadow-[0_24px_80px_rgba(15,23,42,0.4)] backdrop-blur">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,_rgba(22,59,84,0.96),_rgba(26,82,118,0.98)_45%,_rgba(46,134,193,0.92))] px-5 py-6 sm:px-7">
          <div className="flex items-center justify-between gap-2">
            {progressSteps.map((item, index) => {
              const state = getProgressState(currentStep, item.step, Boolean(success));

              return (
                <div key={item.step} className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-extrabold",
                        state === "completed"
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                          : state === "active"
                            ? "border-sky-300 bg-sky-400/20 text-sky-100"
                            : "border-white/20 bg-white/5 text-slate-400",
                      ].join(" ")}
                    >
                      {state === "completed" ? <CheckCircle2 className="h-5 w-5" /> : item.number}
                    </span>
                    <span className="min-w-0 text-start text-sm font-bold text-white/90">{item.label}</span>
                  </div>
                  {index < progressSteps.length - 1 ? <span className="h-px flex-1 bg-white/20" aria-hidden="true" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <CardContent className="space-y-6 p-5 sm:p-7">
          {pageError ? (
            <div className="rounded-[18px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{pageError}</div>
          ) : null}

          {success ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold sm:text-3xl">تم إنشاء حسابك بنجاح</h1>
                <p className="text-sm leading-7 text-slate-300">{success.message}</p>
                <p className="text-sm leading-7 text-slate-300">
                  {success.accountType === "CENTER" ? "اسم السنتر" : "اسم الحساب"}:{" "}
                  <span className="font-bold text-sky-300">{success.tenantName}</span>
                </p>
                <p className="text-sm leading-7 text-slate-300">
                  رابط الدخول:
                  <br />
                  <span dir="ltr" className="font-bold text-sky-300">
                    {success.loginUrl}
                  </span>
                </p>
              </div>

              <a
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-base font-bold text-white transition hover:bg-secondary"
                href={success.loginUrl}
              >
                الانتقال إلى صفحة الدخول
              </a>
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-base font-bold text-white transition hover:bg-white/10"
                href="/"
              >
                العودة للرئيسية
              </Link>
            </div>
          ) : null}

          {!success && currentStep === 1 ? (
            <section className="space-y-5">
              <div className="space-y-2 text-start">
                <h1 className="text-2xl font-extrabold sm:text-3xl">أنشئ حسابك</h1>
                <p className="text-sm leading-7 text-slate-300">
                  اختر نوع الحساب أولًا، ثم أدخل بياناتك الأساسية لإنشاء رابط الدخول الخاص بك.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>نوع الحساب</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {accountTypeOptions.map((option) => {
                      const isActive = form.accountType === option.value;

                      return (
                        <button
                          key={option.value}
                          className={[
                            "flex min-h-[76px] items-center justify-center rounded-[20px] border px-4 py-4 text-center transition",
                            isActive
                              ? "border-sky-300 bg-sky-400/15 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.18)]"
                              : "border-white/10 bg-slate-900/70 text-slate-200 hover:bg-slate-900",
                          ].join(" ")}
                          onClick={() => updateField("accountType", option.value)}
                          type="button"
                        >
                          <p className="text-base font-extrabold">{option.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isCenterAccount ? (
                  <div className="space-y-2">
                    <Label htmlFor="centerName">اسم السنتر</Label>
                    <Input
                      id="centerName"
                      onChange={(event) => updateField("centerName", event.target.value)}
                      placeholder="مثال: سنتر القمة"
                      value={form.centerName}
                      className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500"
                    />
                    {stepOneErrors.centerName ? <p className="text-sm text-rose-300">{stepOneErrors.centerName}</p> : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="teacherName">{isCenterAccount ? "اسم المدرس المسؤول" : "اسم المدرس"}</Label>
                  <Input
                    id="teacherName"
                    onChange={(event) => updateField("teacherName", event.target.value)}
                    placeholder="مثال: أحمد محمد حسن"
                    value={form.teacherName}
                    className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500"
                  />
                  {stepOneErrors.teacherName ? <p className="text-sm text-rose-300">{stepOneErrors.teacherName}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    dir="ltr"
                    id="phone"
                    inputMode="numeric"
                    maxLength={11}
                    onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, ""))}
                    placeholder="01XXXXXXXXX"
                    value={form.phone}
                    className="min-h-11 border-white/10 bg-slate-900/80 text-base font-semibold text-white placeholder:text-slate-500"
                  />
                  {stepOneErrors.phone ? <p className="text-sm text-rose-300">{stepOneErrors.phone}</p> : null}
                </div>

                {!isCenterAccount ? (
                  <div className="space-y-2">
                    <Label htmlFor="subject">المادة الدراسية</Label>
                    <Input
                      id="subject"
                      onChange={(event) => updateField("subject", event.target.value)}
                      placeholder="مثال: رياضيات"
                      value={form.subject}
                      className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500"
                    />
                    {stepOneErrors.subject ? <p className="text-sm text-rose-300">{stepOneErrors.subject}</p> : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="governorate">المحافظة</Label>
                  <Input
                    id="governorate"
                    onChange={(event) => updateField("governorate", event.target.value)}
                    placeholder="مثال: الجيزة"
                    value={form.governorate}
                    className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500"
                  />
                  {stepOneErrors.governorate ? <p className="text-sm text-rose-300">{stepOneErrors.governorate}</p> : null}
                </div>
              </div>

              <Button className="min-h-11 w-full text-base font-bold" onClick={goToStepTwo} type="button">
                التالي <ArrowLeft className="h-4 w-4" />
              </Button>
            </section>
          ) : null}

          {!success && currentStep === 2 ? (
            <section className="space-y-5">
              <div className="space-y-2 text-start">
                <h1 className="text-2xl font-extrabold sm:text-3xl">{isCenterAccount ? "اختر رابط السنتر" : "اختر رابط حسابك"}</h1>
                <p className="text-sm leading-7 text-slate-300">هذا سيكون رابط الدخول الرئيسي للمنصة الخاصة بك.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">{isCenterAccount ? "رابط السنتر / Subdomain" : "رابط الحساب / Subdomain"}</Label>
                <Input
                  dir="ltr"
                  id="subdomain"
                  maxLength={20}
                  onChange={(event) => updateField("subdomain", event.target.value.toLowerCase())}
                  placeholder="مثال: ahmed"
                  value={form.subdomain}
                  className="min-h-11 border-white/10 bg-slate-900/80 text-base font-semibold text-white placeholder:text-slate-500"
                />
                <p className="text-start text-sm text-slate-400">
                  رابط الدخول المتوقع: <span dir="ltr" className="font-bold text-sky-300">{helperSubdomain}.localhost</span>
                </p>
                {subdomainStatus === "available" ? <p className="text-sm font-semibold text-emerald-300">متاح</p> : null}
                {subdomainStatus === "unavailable" ? <p className="text-sm font-semibold text-rose-300">غير متاح</p> : null}
                {liveSubdomainError ? <p className="text-sm text-rose-300">{liveSubdomainError}</p> : null}
                {!liveSubdomainError && subdomainError ? <p className="text-sm text-rose-300">{subdomainError}</p> : null}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button
                  className="min-h-11 border-white/15 bg-transparent text-base text-white hover:bg-white/10 sm:w-auto"
                  onClick={() => setCurrentStep(1)}
                  type="button"
                  variant="outline"
                >
                  رجوع
                </Button>
                <Button className="min-h-11 text-base font-bold sm:w-auto" onClick={goToStepThree} type="button">
                  التالي <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </section>
          ) : null}

          {!success && currentStep === 3 ? (
            <section className="space-y-5">
              <div className="space-y-2 text-start">
                <h1 className="text-2xl font-extrabold sm:text-3xl">راجع البيانات ثم تحقق من الهاتف</h1>
                <p className="text-sm leading-7 text-slate-300">
                  لن يتم إنشاء {isCenterAccount ? "حساب السنتر" : "الحساب"} إلا بعد التحقق من رقم هاتف {isCenterAccount ? "المدرس المسؤول" : "المدرس"}.
                </p>
              </div>

              <div className="space-y-3 rounded-[18px] border border-white/10 bg-slate-900/65 p-4">
                {reviewItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className="text-sm font-bold text-white">{item.value || "-"}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 rounded-[20px] border border-white/10 bg-slate-900/50 p-4">
                <div id={RECAPTCHA_CONTAINER_ID} />
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-2 ${phoneVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{phoneVerified ? "تم التحقق من رقم الهاتف" : "تحقق من رقم الهاتف"}</p>
                    <p className="text-sm leading-6 text-slate-300">
                      {phoneVerified
                        ? "يمكنك الآن إنشاء الحساب بأمان."
                        : `أرسل كود التحقق، ثم أدخله هنا قبل إنشاء ${isCenterAccount ? "حساب السنتر" : "الحساب"}.`}
                    </p>
                  </div>
                </div>

                {!phoneVerified ? (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button className="sm:w-auto" disabled={isSendingOtp || (otpSent && secondsLeft > 0)} onClick={handleSendOtp} type="button">
                        {isSendingOtp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            جارٍ الإرسال...
                          </>
                        ) : otpSent ? (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            {secondsLeft > 0 ? `إعادة الإرسال بعد ${secondsLeft}ث` : "إعادة إرسال الكود"}
                          </>
                        ) : (
                          "إرسال كود التحقق"
                        )}
                      </Button>
                    </div>

                    {otpMessage ? <p className="text-sm text-emerald-300">{otpMessage}</p> : null}
                    {otpError ? <p className="text-sm text-rose-300">{otpError}</p> : null}

                    {otpSent ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-otp">كود التحقق</Label>
                          <Input
                            dir="ltr"
                            id="signup-otp"
                            inputMode="numeric"
                            maxLength={OTP_LENGTH}
                            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                            placeholder="123456"
                            value={otpCode}
                            className="min-h-11 border-white/10 bg-slate-950/70 text-base font-semibold text-white placeholder:text-slate-500"
                          />
                        </div>

                        <Button className="w-full" disabled={isVerifyingOtp} onClick={handleVerifyOtp} type="button">
                          {isVerifyingOtp ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              جارٍ التحقق...
                            </>
                          ) : (
                            "تأكيد الكود"
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    تم ربط هذا الطلب برقم الهاتف <span dir="ltr" className="font-bold">{form.phone}</span>.
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button
                  className="min-h-11 border-white/15 bg-transparent text-base text-white hover:bg-white/10 sm:w-auto"
                  onClick={() => setCurrentStep(2)}
                  type="button"
                  variant="outline"
                >
                  رجوع
                </Button>
                <Button className="min-h-11 text-base font-bold sm:w-auto" disabled={isCreating || !phoneVerified} onClick={handleCreateAccount} type="button">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ إنشاء الحساب...
                    </>
                  ) : (
                    "إنشاء الحساب"
                  )}
                </Button>
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
