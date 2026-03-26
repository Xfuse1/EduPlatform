'use client';

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  if (form.parentName.trim().length < 3) {
    errors.parentName = "يرجى إدخال اسم ولي الأمر كاملًا بحد أدنى 3 أحرف";
  }

  if (!/^01\d{9}$/.test(form.phone)) {
    errors.phone = "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01";
  }

  return errors;
}

export function ParentRegisterLauncher() {
  const [form, setForm] = useState<FormState>({
    parentName: "",
    phone: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [pageError, setPageError] = useState("");
  const [resolvedAccount, setResolvedAccount] = useState<ResolvedAccount | null>(null);

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
  const autoSendOtpKeyRef = useRef("");

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

  useEffect(() => {
    if (!resolvedAccount) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.assign(resolvedAccount.redirectTo);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [resolvedAccount]);

  useEffect(() => {
    const nextErrors = validateForm(form);
    const autoSendKey = form.phone;

    if (nextErrors.phone || nextErrors.parentName || !form.phone || otpSent || phoneVerified || autoSendOtpKeyRef.current === autoSendKey) {
      return;
    }

    autoSendOtpKeyRef.current = autoSendKey;
    handleSendOtp();
  }, [form, otpSent, phoneVerified]);

  const resetPhoneVerificationState = () => {
    autoSendOtpKeyRef.current = "";
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
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setPageError("");
    setResolvedAccount(null);
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    if (field === "phone") {
      resetPhoneVerificationState();
    }
  };

  const handleSendOtp = (ignoreCooldown = false) => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setPageError("");
    setOtpError("");
    setOtpMessage("");

    if (nextErrors.phone || nextErrors.parentName) {
      return;
    }

    if (secondsLeft > 0 && otpSent && !ignoreCooldown) {
      return;
    }

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
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setPageError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!phoneVerified || !verifiedIdToken) {
      setPageError("يجب التحقق من رقم الهاتف قبل إنشاء الحساب");
      return;
    }

    startCreating(async () => {
      const result = await createParentSignup({
        parentName: form.parentName,
        phone: form.phone,
        idToken: verifiedIdToken,
      });

      if (result.redirectTo && result.accessUrl && result.tenantName) {
        setResolvedAccount({
          kind: result.success ? "created" : "existing",
          accessUrl: result.accessUrl,
          redirectTo: result.redirectTo,
          message: result.message ?? (result.success ? "تم إنشاء الحساب بنجاح." : "يوجد حساب بالفعل."),
          tenantName: result.tenantName,
        });
        return;
      }

      if (!result.success) {
        setPageError(result.message ?? "تعذر إنشاء حساب ولي الأمر");
        return;
      }

      setPageError("تم إنشاء الحساب لكن تعذر تجهيز رابط الدخول");
    });
  };

  if (resolvedAccount) {
    return (
      <Card className="overflow-hidden rounded-[30px] border-white/10 bg-white/92 shadow-[0_30px_80px_rgba(7,15,30,0.24)] backdrop-blur dark:border-white/5 dark:bg-slate-900/88">
        <CardContent className="space-y-6 px-6 py-8 text-center sm:px-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white">
              {resolvedAccount.kind === "created" ? "تم إنشاء الحساب بنجاح" : "الحساب موجود بالفعل"}
            </h2>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{resolvedAccount.message}</p>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              اسم الحساب: <span className="font-bold text-sky-700 dark:text-sky-300">{resolvedAccount.tenantName}</span>
            </p>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              رابط الدخول:
              <br />
              <span className="font-bold text-sky-700 dark:text-sky-300" dir="ltr">
                {resolvedAccount.accessUrl}
              </span>
            </p>
          </div>

          <a
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-base font-bold text-white transition hover:bg-secondary"
            href={resolvedAccount.redirectTo}
          >
            الذهاب إلى صفحة الدخول
          </a>
          <Link
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-300/80 bg-white/80 px-4 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-950/20 dark:text-slate-100 dark:hover:bg-slate-900"
            href="/"
          >
            العودة للرئيسية
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[30px] border-white/10 bg-white/92 shadow-[0_30px_80px_rgba(7,15,30,0.24)] backdrop-blur dark:border-white/5 dark:bg-slate-900/88">
      <CardHeader className="border-b border-slate-200/70 bg-[linear-gradient(135deg,_#10324B,_#1A5276_55%,_#2E86C1)] px-6 py-7 text-white sm:px-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
          <UserRound className="h-3.5 w-3.5" />
          <span>إنشاء حساب ولي أمر مستقل</span>
        </div>
        <CardTitle className="mt-4 text-3xl font-extrabold tracking-tight text-white">أنشئ حساب ولي الأمر بدون ربط بسنتر</CardTitle>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/88">
          الحساب المستقل لولي الأمر يمكن إنشاؤه مباشرة برقم الهاتف، ثم تسجيل الدخول من رابطه الخاص ومتابعة ربط الأبناء لاحقًا.
        </p>
      </CardHeader>

      <CardContent className="space-y-6 bg-[linear-gradient(180deg,rgba(244,248,252,0.95)_0%,rgba(236,243,249,0.9)_100%)] p-6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.72)_0%,rgba(15,23,42,0.88)_100%)] sm:p-8">
        {pageError ? (
          <p className="rounded-[18px] border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
            {pageError}
          </p>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5 rounded-[26px] border border-slate-200/70 bg-white/80 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/35">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-100" htmlFor="parentName">
                اسم ولي الأمر
              </Label>
              <Input
                className="rounded-2xl border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-900/80"
                id="parentName"
                onChange={(event) => updateField("parentName", event.target.value)}
                placeholder="مثال: أحمد محمد علي"
                value={form.parentName}
              />
              {errors.parentName ? <p className="text-sm text-rose-600 dark:text-rose-300">{errors.parentName}</p> : null}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-100" htmlFor="phone">
                رقم الهاتف
              </Label>
              <Input
                className="rounded-2xl border-slate-200/80 bg-slate-50/90 font-semibold dark:border-slate-700/80 dark:bg-slate-900/80"
                dir="ltr"
                id="phone"
                inputMode="numeric"
                maxLength={11}
                onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, ""))}
                placeholder="01XXXXXXXXX"
                value={form.phone}
              />
              <p className="text-sm text-slate-500 dark:text-slate-400">سيكون هذا الرقم هو رقم الدخول إلى الحساب.</p>
              {errors.phone ? <p className="text-sm text-rose-600 dark:text-rose-300">{errors.phone}</p> : null}
            </div>

            <div className="space-y-4 rounded-[22px] border border-slate-200/70 bg-slate-50/85 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              <div id={RECAPTCHA_CONTAINER_ID} />

              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-2 ${phoneVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {phoneVerified ? "تم التحقق من رقم الهاتف" : "التحقق من رقم الهاتف"}
                  </p>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {phoneVerified ? "يمكنك الآن إنشاء الحساب بأمان." : "سيتم إرسال كود التحقق تلقائيًا، ثم أدخله هنا لإكمال إنشاء الحساب."}
                  </p>
                </div>
              </div>

              {!phoneVerified ? (
                <>
                  <div className="rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-800/80 dark:bg-slate-950/30 dark:text-slate-300">
                    {isSendingOtp && !otpSent ? (
                      <span className="inline-flex items-center gap-2 font-semibold text-sky-700 dark:text-sky-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جارٍ إرسال كود التحقق تلقائيًا...
                      </span>
                    ) : otpSent && secondsLeft > 0 ? (
                      <span className="font-semibold">
                        يمكنك إعادة الإرسال بعد <span dir="ltr">{secondsLeft}</span> ثانية
                      </span>
                    ) : (
                      <button
                        className="inline-flex items-center gap-2 font-bold text-sky-700 transition hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-sky-300 dark:hover:text-sky-200"
                        disabled={isSendingOtp}
                        onClick={() => handleSendOtp(true)}
                        type="button"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {otpSent ? "إعادة إرسال الكود" : "إعادة المحاولة"}
                      </button>
                    )}
                  </div>

                  {otpMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{otpMessage}</p> : null}
                  {otpError ? <p className="text-sm text-rose-600 dark:text-rose-300">{otpError}</p> : null}

                  {otpSent ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-100" htmlFor="parent-signup-otp">
                          كود التحقق
                        </Label>
                        <Input
                          className="rounded-2xl border-slate-200/80 bg-white/90 text-base font-semibold dark:border-slate-700/80 dark:bg-slate-900/80"
                          dir="ltr"
                          id="parent-signup-otp"
                          inputMode="numeric"
                          maxLength={OTP_LENGTH}
                          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                          placeholder="123456"
                          value={otpCode}
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
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-100">
                  تم ربط هذا الطلب برقم الهاتف <span className="font-bold" dir="ltr">{form.phone}</span>.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-[26px] border border-slate-200/70 bg-white/70 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/30">
            <div>
              <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">ما الذي ستحصل عليه؟</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                حساب ولي أمر مستقل برابط دخول خاص بك، ويمكن استخدامه لاحقًا في متابعة الأبناء بعد ربطهم بالحساب.
              </p>
            </div>

            <div className="space-y-3 rounded-[22px] border border-slate-200/70 bg-slate-50/85 p-4 text-sm text-slate-600 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-300">
              <p>لن تحتاج لاختيار سنتر أثناء إنشاء الحساب.</p>
              <p>رقم الهاتف هو وسيلة الدخول الأساسية.</p>
              <p>إذا كان الرقم عليه حساب مستقل بالفعل سنعرض لك رابط الدخول مباشرة.</p>
            </div>

            <div className="grid gap-3">
              <Button className="w-full rounded-2xl py-3.5 text-base shadow-[0_18px_45px_rgba(26,82,118,0.24)]" disabled={isCreating || !phoneVerified} onClick={handleCreateAccount} type="button">
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ إنشاء الحساب...
                  </>
                ) : (
                  "إنشاء حساب ولي الأمر"
                )}
              </Button>
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-300/80 bg-white/80 px-4 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-950/20 dark:text-slate-100 dark:hover:bg-slate-900"
                href="/login?portal=parent"
              >
                لدي حساب بالفعل
                <ArrowLeft className="ms-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

