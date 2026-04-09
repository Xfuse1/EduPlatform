"use client";

import Link from "next/link";
import { Check, CheckCircle2, CircleAlert, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createTeacherSignup, checkSubdomainAvailability } from "@/modules/marketing/actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignupStep = 1 | 2 | 3;

type FormState = {
  teacherName: string;
  phone: string;
  subject: string;
  governorate: string;
  subdomain: string;
};

type StepOneErrors = {
  teacherName?: string;
  phone?: string;
  subject?: string;
  governorate?: string;
};

const RESERVED_SUBDOMAINS = new Set(["ahmed", "noor", "test", "admin", "www"]);
const OTP_LENGTH = 6;

const progressSteps = [
  { step: 1, number: "١", label: "البيانات" },
  { step: 2, number: "٢", label: "السنتر" },
  { step: 3, number: "٣", label: "التأكيد" },
] as const;

function validateStepOne(form: FormState): StepOneErrors {
  const errors: StepOneErrors = {};

  if (form.teacherName.trim().length < 3) {
    errors.teacherName = "يجب كتابة اسم المعلم كاملًا بحد أدنى 3 أحرف";
  }

  if (!/^01\d{9}$/.test(form.phone)) {
    errors.phone = "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01";
  }

  if (form.subject.trim().length === 0) {
    errors.subject = "يرجى إدخال المادة الدراسية";
  }

  if (form.governorate.trim().length === 0) {
    errors.governorate = "يرجى إدخال المحافظة";
  }

  return errors;
}

function getSubdomainError(subdomain: string) {
  const normalizedValue = subdomain.trim().toLowerCase();

  if (normalizedValue.length < 3 || normalizedValue.length > 20) {
    return "يجب أن يكون اسم السنتر بين 3 و20 حرفًا";
  }

  if (!/^[a-z0-9-]+$/.test(normalizedValue)) {
    return "يجب أن يحتوي على حروف إنجليزية وأرقام فقط";
  }

  if (RESERVED_SUBDOMAINS.has(normalizedValue)) {
    return "هذا الاسم غير متاح حاليًا";
  }

  return "";
}

function getProgressState(currentStep: SignupStep, itemStep: number, isVerified: boolean) {
  if (isVerified || itemStep < currentStep) {
    return "completed";
  }

  if (itemStep === currentStep) {
    return "active";
  }

  return "upcoming";
}

function isLocalDevelopmentHost() {
  if (typeof window === "undefined") {
    return false;
  }

  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function mapSignupOtpError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/billing-not-enabled":
      return isLocalDevelopmentHost()
        ? "خدمة تسجيل الدخول برقم الهاتف في Firebase تحتاج تفعيل Billing أو استخدام أرقام اختبار Firebase أثناء التطوير."
        : "خدمة التحقق برقم الهاتف غير مفعلة حاليًا. تواصل مع إدارة المنصة.";
    case "auth/quota-exceeded":
      return "تم تجاوز حصة الإرسال في Firebase.";
    case "auth/too-many-requests":
      return "تمت محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.";
    case "auth/invalid-phone-number":
      return "رقم الهاتف غير صحيح.";
    case "auth/captcha-check-failed":
      return "فشل التحقق الأمني من Firebase. أعد المحاولة.";
    case "auth/missing-app-credential":
    case "auth/invalid-app-credential":
      return "تعذر إنشاء اعتماد Firebase المطلوب لهذا الطلب.";
    case "auth/internal-error":
      return isLocalDevelopmentHost()
        ? "تعذر إرسال كود التحقق على localhost. استخدم رقم اختبار Firebase أو فعّل الخدمة."
        : "تعذر إرسال كود التحقق الآن. حاول مرة أخرى بعد قليل.";
    default:
      return "تعذر إرسال كود التحقق. تحقق من رقم الهاتف وحاول مرة أخرى.";
  }
}

export default function TeacherSignupPage() {
  const [isReady, setIsReady] = useState(false);
  const [currentStep, setCurrentStep] = useState<SignupStep>(1);
  const [form, setForm] = useState<FormState>({
    teacherName: "",
    phone: "",
    subject: "",
    governorate: "",
    subdomain: "",
  });
  const [stepOneErrors, setStepOneErrors] = useState<StepOneErrors>({});
  const [subdomainError, setSubdomainError] = useState("");
  const [pageError, setPageError] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [otpError, setOtpError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [dbSubdomainStatus, setDbSubdomainStatus] = useState<"idle" | "available" | "taken">("idle");
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const verifyTimerRef = useRef<number | null>(null);
  const subdomainCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsReady(true);

    return () => {
      if (verifyTimerRef.current !== null) {
        window.clearTimeout(verifyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentStep !== 3 || isVerified) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((currentValue) => (currentValue > 0 ? currentValue - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentStep, isVerified]);

  useEffect(() => {
    const otpCode = otpDigits.join("");

    if (currentStep !== 3 || isVerified || isVerifyingOtp) {
      return;
    }

    if (otpCode.length === OTP_LENGTH && !otpDigits.includes("")) {
      setIsVerifyingOtp(true);
      setOtpError("");
      setPageError("");

      (async () => {
        try {
          const { getConfirmationResult, clearConfirmationResult, clearRecaptchaVerifier } = await import("@/lib/firebase-phone-otp");
          const confirmation = getConfirmationResult();

          if (!confirmation) {
            setOtpError("انتهت الجلسة، يرجى العودة وإرسال الكود من جديد");
            setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
            setIsVerifyingOtp(false);
            inputsRef.current[0]?.focus();
            return;
          }

          const userCredential = await confirmation.confirm(otpCode);
          const idToken = await userCredential.user.getIdToken();
          clearConfirmationResult();
          clearRecaptchaVerifier();

          // Call server action to create account
          const result = await createTeacherSignup({
            teacherName: form.teacherName,
            phone: form.phone,
            subject: form.subject,
            governorate: form.governorate,
            subdomain: form.subdomain,
            idToken,
          });

          if (!result.success) {
            setPageError(result.message);
            setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
            setIsVerifyingOtp(false);
            return;
          }

          setIsVerified(true);
          setIsVerifyingOtp(false);

          // Redirect after short delay
          window.setTimeout(() => {
            window.location.replace(result.redirectTo);
          }, 1500);
        } catch (err: unknown) {
          const firebaseError = err as { code?: string };
          if (firebaseError.code === "auth/invalid-verification-code") {
            setOtpError("كود التحقق غير صحيح. جرّب مرة أخرى");
          } else if (firebaseError.code === "auth/code-expired") {
            setOtpError("انتهت صلاحية الكود، يرجى إعادة الإرسال");
          } else {
            setOtpError("كود التحقق غير صحيح. جرّب مرة أخرى");
          }
          setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
          setIsVerifyingOtp(false);
          inputsRef.current[0]?.focus();
        }
      })();
    }
  }, [currentStep, isVerified, isVerifyingOtp, otpDigits]);

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

  const updateField = (field: keyof FormState, value: string) => {
    setForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
    setPageError("");

    if (field === "teacherName" || field === "phone" || field === "subject" || field === "governorate") {
      setStepOneErrors((currentValue) => ({
        ...currentValue,
        [field]: undefined,
      }));
    }

    if (field === "subdomain") {
      setSubdomainError("");
      setDbSubdomainStatus("idle");

      // Debounced DB check
      if (subdomainCheckTimer.current) clearTimeout(subdomainCheckTimer.current);
      const normalized = value.trim().toLowerCase();
      if (normalized.length >= 3 && !getSubdomainError(normalized)) {
        setIsCheckingSubdomain(true);
        subdomainCheckTimer.current = setTimeout(async () => {
          const result = await checkSubdomainAvailability(normalized);
          const isTaken = !result.available && (result.message ?? "").includes("مستخدم بالفعل");
          setDbSubdomainStatus(result.available ? "available" : isTaken ? "taken" : "idle");
          if (!result.available) setSubdomainError(result.message ?? "هذا الرابط مستخدم بالفعل");
          setIsCheckingSubdomain(false);
        }, 600);
      }
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

  const goToStepThree = async () => {
    const error = getSubdomainError(form.subdomain);
    setSubdomainError(error);
    setPageError("");

    if (error) return;
    if (isCheckingSubdomain) return;
    if (dbSubdomainStatus === "taken") {
      setSubdomainError("هذا الرابط مستخدم بالفعل");
      return;
    }

    setIsSendingOtp(true);
    try {
      const { signInWithPhoneNumber } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const { getOrCreateRecaptchaVerifier, clearRecaptchaVerifier, setConfirmationResult } = await import("@/lib/firebase-phone-otp");

      clearRecaptchaVerifier();
      const auth = await getFirebaseAuth();
      const verifier = await getOrCreateRecaptchaVerifier("recaptcha-container-signup");
      const e164 = "+2" + form.phone;
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      setConfirmationResult(confirmation);

      setCurrentStep(3);
      setSecondsLeft(60);
      setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      setOtpError("");
      setIsVerified(false);
    } catch (err) {
      setPageError(mapSignupOtpError(err));
      import("@/lib/firebase-phone-otp").then(({ clearRecaptchaVerifier }) => clearRecaptchaVerifier());
    } finally {
      setIsSendingOtp(false);
    }
  };

  const goBackToStepOne = () => {
    setCurrentStep(1);
    setSubdomainError("");
    setPageError("");
  };

  const goBackToStepTwo = () => {
    setCurrentStep(2);
    setOtpError("");
    setPageError("");
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setIsVerifyingOtp(false);
    if (verifyTimerRef.current !== null) {
      window.clearTimeout(verifyTimerRef.current);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    setOtpError("");
    setPageError("");
    setOtpDigits((currentValue) => {
      const nextDigits = [...currentValue];
      nextDigits[index] = nextValue;
      return nextDigits;
    });

    if (nextValue && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || isResending) return;

    setIsResending(true);
    setOtpError("");
    setPageError("");

    try {
      const { signInWithPhoneNumber } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const { getOrCreateRecaptchaVerifier, clearRecaptchaVerifier, setConfirmationResult } = await import("@/lib/firebase-phone-otp");

      clearRecaptchaVerifier();
      const auth = await getFirebaseAuth();
      const verifier = await getOrCreateRecaptchaVerifier("recaptcha-container-signup");
      const e164 = "+2" + form.phone;
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      setConfirmationResult(confirmation);
      setSecondsLeft(60);
      setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setOtpError(mapSignupOtpError(err));
      import("@/lib/firebase-phone-otp").then(({ clearRecaptchaVerifier }) => clearRecaptchaVerifier());
    } finally {
      setIsResending(false);
    }
  };

  if (!isReady) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.22),_transparent_30%),linear-gradient(145deg,_#0f2740_0%,_#1A5276_45%,_#dbeafe_120%)] px-4 py-8 sm:px-6"
        dir="rtl"
      >
        <Card className="w-full max-w-[500px] rounded-[28px] border-white/10 bg-slate-950/80 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 text-center sm:p-8">
            <Loader2 className="h-10 w-10 animate-spin text-sky-300" />
            <div className="space-y-2">
              <h1 className="text-xl font-extrabold">جارٍ تجهيز صفحة التسجيل</h1>
              <p className="text-sm leading-7 text-slate-300">لحظات وننقلك إلى خطوات إنشاء الحساب</p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.22),_transparent_30%),linear-gradient(145deg,_#0f2740_0%,_#1A5276_45%,_#dbeafe_120%)] px-4 py-8 sm:px-6"
      dir="rtl"
    >
      <Link
        href="/"
        className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:end-6 sm:top-6"
      >
        <span>›</span>
        رجوع
      </Link>

      <Card className="w-full max-w-[500px] overflow-hidden rounded-[28px] border-white/10 bg-slate-950/85 font-[Cairo] text-white shadow-[0_24px_80px_rgba(15,23,42,0.4)] backdrop-blur">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,_rgba(22,59,84,0.96),_rgba(26,82,118,0.98)_45%,_rgba(46,134,193,0.92))] px-5 py-6 sm:px-7">
          <div className="flex items-center justify-between gap-2">
            {progressSteps.map((item, index) => {
              const state = getProgressState(currentStep, item.step, isVerified);

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
                      {state === "completed" ? <Check className="h-5 w-5" /> : item.number}
                    </span>
                    <span className="min-w-0 text-start text-sm font-bold text-white/90">{item.label}</span>
                  </div>
                  {index < progressSteps.length - 1 ? (
                    <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <CardContent className="space-y-6 p-5 sm:p-7">
          {pageError ? (
            <div className="flex items-start gap-3 rounded-[18px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-start leading-7">{pageError}</p>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <section className="space-y-5">
              <div className="space-y-2 text-start">
                <h1 className="text-2xl font-extrabold sm:text-3xl">أنشئ حسابك المجاني</h1>
                <p className="text-sm leading-7 text-slate-300">ابدأ في أقل من دقيقتين</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherName">اسم المعلم</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="subject">المادة الدراسية</Label>
                  <Input
                    id="subject"
                    onChange={(event) => updateField("subject", event.target.value)}
                    placeholder="مثال: رياضيات، فيزياء، لغة عربية"
                    value={form.subject}
                    className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500"
                  />
                  {stepOneErrors.subject ? <p className="text-sm text-rose-300">{stepOneErrors.subject}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="governorate">المحافظة</Label>
                  <Input
                    id="governorate"
                    onChange={(event) => updateField("governorate", event.target.value)}
                    placeholder="مثال: القاهرة، الجيزة، سوهاج"
                    value={form.governorate}
                    className="min-h-11 border-white/10 bg-slate-900/80 text-base text-white placeholder:text-slate-500"
                  />
                  {stepOneErrors.governorate ? <p className="text-sm text-rose-300">{stepOneErrors.governorate}</p> : null}
                </div>
              </div>

              <Button className="min-h-11 w-full text-base font-bold" onClick={goToStepTwo} type="button">
                التالي ←
              </Button>
            </section>
          ) : null}

          {currentStep === 2 ? (
            <section className="space-y-5">
              <div className="space-y-2 text-start">
                <h1 className="text-2xl font-extrabold sm:text-3xl">اختر اسم سنترك</h1>
                <p className="text-sm leading-7 text-slate-300">هذا سيكون رابطك الخاص على المنصة</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">اسم السنتر / الـ Subdomain</Label>
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
                  رابطك سيكون: <span dir="ltr" className="font-bold text-sky-300">{helperSubdomain}.eduplatform.com</span>
                </p>
                {isCheckingSubdomain ? (
                  <p className="text-sm font-semibold text-slate-400">جارٍ التحقق...</p>
                ) : dbSubdomainStatus === "available" ? (
                  <p className="text-sm font-semibold text-emerald-300">متاح ✅</p>
                ) : dbSubdomainStatus === "taken" ? (
                  <p className="text-sm font-semibold text-rose-300">غير متاح ❌</p>
                ) : subdomainStatus === "available" && normalizedSubdomain.length >= 3 ? (
                  <p className="text-sm font-semibold text-slate-400">جارٍ التحقق...</p>
                ) : null}
                {liveSubdomainError ? <p className="text-sm text-rose-300">{liveSubdomainError}</p> : null}
                {!liveSubdomainError && subdomainError ? <p className="text-sm text-rose-300">{subdomainError}</p> : null}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button
                  className="min-h-11 border-white/15 bg-transparent text-base text-white hover:bg-white/10 sm:w-auto"
                  onClick={goBackToStepOne}
                  type="button"
                  variant="outline"
                >
                  ← رجوع
                </Button>
                <Button className="min-h-11 text-base font-bold sm:w-auto" disabled={isSendingOtp} onClick={goToStepThree} type="button">
                  {isSendingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />جارٍ الإرسال...</> : "التالي ←"}
                </Button>
              </div>
            </section>
          ) : null}

          {currentStep === 3 ? (
            <section className="space-y-5">
              {!isVerified ? (
                <>
                  <div className="space-y-2 text-start">
                    <h1 className="text-2xl font-extrabold sm:text-3xl">تأكيد رقم الهاتف</h1>
                    <p className="text-sm leading-7 text-slate-300">
                      أدخل كود التحقق المرسل إلى <span dir="ltr">{form.phone}</span>
                    </p>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-slate-900/70 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-start">
                        <p className="text-sm font-bold text-white">مدة صلاحية الكود</p>
                        <p className="text-sm text-slate-400">أدخل الرمز قبل انتهاء العداد ثم سيُعاد الإرسال</p>
                      </div>
                      <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-sky-200">
                        <span dir="ltr">{secondsLeft}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2" dir="ltr">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={`signup-otp-${index}`}
                        aria-label={`رقم ${index + 1} من كود التحقق`}
                        ref={(element) => {
                          inputsRef.current[index] = element;
                        }}
                        className="h-14 w-12 rounded-2xl border border-white/10 bg-slate-900/80 text-center text-2xl font-extrabold text-white outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-400/15 sm:w-14"
                        inputMode="numeric"
                        maxLength={1}
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        value={digit}
                      />
                    ))}
                  </div>

                  {otpError ? <p className="text-sm text-rose-300">{otpError}</p> : null}

                  <div className="rounded-[18px] border border-white/10 bg-slate-900/60 px-4 py-4 text-center">
                    {secondsLeft > 0 ? (
                      <p className="text-sm font-semibold text-slate-300">
                        يمكنك إعادة الإرسال بعد <span dir="ltr">{secondsLeft}</span> ثانية
                      </p>
                    ) : (
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sky-400/10 px-5 py-3 text-sm font-bold text-sky-300 transition hover:bg-sky-400/15"
                        onClick={handleResend}
                        type="button"
                      >
                        {isResending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            جارٍ إعادة الإرسال...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            إعادة إرسال الكود
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <Button className="min-h-11 w-full text-base font-bold" disabled={isVerifyingOtp} type="button">
                    {isVerifyingOtp ? "جارٍ التحقق..." : "بانتظار اكتمال إدخال الكود"}
                  </Button>

                  <Button
                    className="min-h-11 w-full border-white/15 bg-transparent text-base text-white hover:bg-white/10"
                    onClick={goBackToStepTwo}
                    type="button"
                    variant="outline"
                  >
                    ← رجوع
                  </Button>
                </>
              ) : (
                <div className="space-y-5 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold sm:text-3xl">🎉 تم إنشاء حسابك بنجاح!</h1>
                    <p className="text-sm leading-7 text-slate-300">
                      سنترك جاهز على:
                      <br />
                      <span dir="ltr" className="font-bold text-sky-300">{normalizedSubdomain}.eduplatform.com</span>
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-base font-bold text-white transition hover:bg-secondary"
                    href="/teacher"
                  >
                    ادخل إلى سنترك ←
                  </Link>
                  <Button
                    className="min-h-11 w-full border-white/15 bg-transparent text-base text-white hover:bg-white/10"
                    onClick={goBackToStepTwo}
                    type="button"
                    variant="outline"
                  >
                    ← رجوع
                  </Button>
                </div>
              )}
            </section>
          ) : null}
        </CardContent>
        <div className="border-t border-white/10 px-5 py-4 text-center sm:px-7">
          <p className="text-sm text-slate-400">
            ولي أمر وتريد تسجيل ابنك؟{" "}
            <Link href="/parent-register" className="font-bold text-sky-300 transition hover:text-sky-200 hover:underline">
              أنشئ حساب ولي أمر
            </Link>
          </p>
        </div>
      </Card>
      <div aria-hidden="true" id="recaptcha-container-signup" />
    </main>
  );
}
