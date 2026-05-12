'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EDUCATION_STAGE_OPTIONS, formatGradeLevel, getEducationYears } from "@/lib/grade-levels";

const selectClassName =
  "touch-target flex min-h-12 w-full rounded-[10px] border border-slate-200 bg-slate-100/50 dark:border-white/10 dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-[#00B8A0] focus:ring-4 focus:ring-[#00B8A0]/15 disabled:cursor-not-allowed disabled:opacity-60";

export function StudentRegistrationForm({ tenantName, tenantSlug, initialPhone }: { tenantName: string; tenantSlug?: string; initialPhone?: string }) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [educationStage, setEducationStage] = useState<"" | (typeof EDUCATION_STAGE_OPTIONS)[number]["value"]>("");
  const [gradeYear, setGradeYear] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const gradeYearOptions = educationStage ? getEducationYears(educationStage) : [];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (studentName.trim().length < 2) {
      setError("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }

    if (!/^01\d{9}$/.test(phone)) {
      setError("يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01");
      return;
    }

    if (!educationStage) {
      setError("المرحلة الدراسية مطلوبة");
      return;
    }

    if (!gradeYear) {
      setError("سنة المرحلة الدراسية مطلوبة");
      return;
    }

    const gradeLevelValue = formatGradeLevel(educationStage, Number(gradeYear));

    startTransition(async () => {
      try {
        const { sendFirebasePhoneOtp } = await import("@/modules/auth/lib/firebasePhoneOtp");
        const result = await sendFirebasePhoneOtp(phone, "recaptcha-container-register");

        if (!result.success) {
          setError(result.message ?? "تعذر إرسال كود التحقق");
          return;
        }

        const params = new URLSearchParams({
          phone,
          mode: "register",
          studentName: studentName.trim(),
          gradeLevel: gradeLevelValue,
        });

        const verifyPath = tenantSlug ? `/${tenantSlug}/verify` : "/verify";
        router.push(`${verifyPath}?${params.toString()}`);
      } catch (err) {
        console.error("[StudentRegistrationForm] sendOTP failed:", err);
        setError("تعذر إرسال كود التحقق. تأكد من رقم الهاتف وحاول مرة أخرى.");
      }
    });
  };

  return (
    <Card 
      className="overflow-hidden border-slate-200 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/5 dark:shadow-[0_0_60px_rgba(0,184,160,0.08)] rounded-[20px]"
    >
      <CardHeader className="border-b border-slate-100 px-4 py-6 text-slate-900 dark:border-white/5 dark:text-white sm:px-8 sm:py-7">
        <div className="mx-auto mb-4 flex h-[48px] w-[48px] items-center justify-center">
          <img alt="Logo" className="h-full w-full object-contain" src="/images/logo.svg" />
        </div>
        <CardTitle className="mt-4 text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          حساب طالب جديد لدى {tenantName}
        </CardTitle>
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-[#94A3B8] text-center">
          أنشئ حساب الطالب في {tenantName} باستخدام رقم الهاتف.
        </p>
      </CardHeader>

      <CardContent className="space-y-5 bg-transparent p-4 sm:space-y-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-white" htmlFor="studentName">اسم الطالب</Label>
              <Input
                id="studentName"
                name="studentName"
                value={studentName}
                onChange={(event) => { setStudentName(event.target.value); setError(""); }}
                placeholder="اكتب اسم الطالب"
                className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-[10px] text-slate-900 dark:text-white focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-white" htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                name="phone"
                dir="ltr"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="01XXXXXXXXX"
                className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-[10px] text-slate-900 dark:text-white focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-white" htmlFor="educationStage">المرحلة الدراسية</Label>
              <select
                aria-label="المرحلة الدراسية"
                id="educationStage"
                className={selectClassName}
                value={educationStage}
                onChange={(event) => {
                  setEducationStage(event.target.value as typeof educationStage);
                  setGradeYear("");
                  setError("");
                }}
              >
                <option value="">اختر المرحلة الدراسية</option>
                {EDUCATION_STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-white" htmlFor="gradeYear">سنة المرحلة الدراسية</Label>
              <select
                aria-label="سنة المرحلة الدراسية"
                id="gradeYear"
                className={selectClassName}
                value={gradeYear}
                disabled={!educationStage}
                onChange={(event) => { setGradeYear(event.target.value); setError(""); }}
              >
                <option value="">اختر السنة الدراسية</option>
                {gradeYearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <Button 
            className="w-full rounded-[10px] py-3.5 text-base bg-[linear-gradient(135deg,#00B8A0,#1A2B6D)] hover:bg-[linear-gradient(135deg,#00c4ab,#1e3480)] hover:-translate-y-[1px] transition-all text-white border-0" 
            disabled={isPending} 
            type="submit"
          >
            {isPending ? "جارٍ إرسال كود التحقق..." : "إرسال كود التحقق"}
          </Button>

          <div className="text-center text-sm text-[#94A3B8]">
            لديك حساب بالفعل؟
            <Link href={tenantSlug ? `/${tenantSlug}/login` : "/login"} className="font-semibold text-[#00B8A0] transition hover:text-[#00c4ab] ms-1">
              تسجيل الدخول
            </Link>
          </div>
        </form>
      </CardContent>

      <div id="recaptcha-container-register" />
    </Card>
  );
}
