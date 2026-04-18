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
  "touch-target flex min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-secondary focus:ring-4 focus:ring-secondary/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function StudentRegistrationForm({ tenantName, initialPhone }: { tenantName: string; initialPhone?: string }) {
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

        router.push(`/verify?${params.toString()}`);
      } catch (err) {
        console.error("[StudentRegistrationForm] sendOTP failed:", err);
        setError("تعذر إرسال كود التحقق. تأكد من رقم الهاتف وحاول مرة أخرى.");
      }
    });
  };

  return (
    <Card className="overflow-hidden rounded-[32px] border-white/10 bg-white/90 shadow-[0_35px_90px_rgba(8,15,30,0.28)] backdrop-blur dark:border-white/5 dark:bg-slate-950/85">
      <CardHeader className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(18,37,59,0.96)_0%,rgba(28,51,78,0.94)_55%,rgba(37,68,102,0.9)_100%)] px-6 py-7 text-white dark:border-slate-800/70 sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
          إنشاء حساب طالب
        </div>
        <CardTitle className="mt-4 text-3xl font-extrabold tracking-tight text-white">حساب طالب جديد</CardTitle>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/90">
          أنشئ حساب الطالب في {tenantName} باستخدام رقم الهاتف، وسيُطلب منك إدخال كود التحقق عبر SMS.
        </p>
      </CardHeader>

      <CardContent className="space-y-6 bg-[linear-gradient(180deg,rgba(244,248,252,0.95)_0%,rgba(236,243,249,0.9)_100%)] p-6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.75)_0%,rgba(15,23,42,0.88)_100%)] sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="studentName">اسم الطالب</Label>
              <Input
                id="studentName"
                name="studentName"
                value={studentName}
                onChange={(event) => { setStudentName(event.target.value); setError(""); }}
                placeholder="اكتب اسم الطالب"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                name="phone"
                dir="ltr"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="educationStage">المرحلة الدراسية</Label>
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
              <Label htmlFor="gradeYear">سنة المرحلة الدراسية</Label>
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

          <Button className="w-full rounded-2xl py-3.5 text-base" disabled={isPending} type="submit">
            {isPending ? "جارٍ إرسال كود التحقق..." : "إرسال كود التحقق"}
          </Button>

          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            لديك حساب بالفعل؟
            <Link href="/login" className="font-semibold text-sky-600 transition hover:text-sky-400">
              تسجيل الدخول
            </Link>
          </div>
        </form>
      </CardContent>

      <div id="recaptcha-container-register" />
    </Card>
  );
}
