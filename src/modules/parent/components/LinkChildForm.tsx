'use client';

import { Link2, Loader2, PlusCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EDUCATION_STAGE_OPTIONS, formatGradeLevel, getEducationYears, type EducationStage } from "@/lib/grade-levels";
import { linkChildToParent } from "@/modules/parent/actions";

const selectClassName =
  "touch-target flex min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-secondary focus:ring-4 focus:ring-secondary/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function LinkChildForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [educationStage, setEducationStage] = useState<EducationStage | "">("");
  const [gradeYear, setGradeYear] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const gradeYearOptions = educationStage ? getEducationYears(educationStage) : [];
  const gradeLevel = educationStage && gradeYear ? formatGradeLevel(educationStage, Number(gradeYear)) : "";

  const resetForm = () => {
    setStudentName("");
    setStudentPhone("");
    setEducationStage("");
    setGradeYear("");
    setTenantSlug("");
    setError("");
    setIsOpen(false);
  };

  const handleEducationStageChange = (value: string) => {
    const nextStage = value as EducationStage | "";
    setEducationStage(nextStage);
    setError("");

    if (!nextStage) {
      setGradeYear("");
      return;
    }

    setGradeYear((currentYear) => {
      const hasCurrentYear = getEducationYears(nextStage).some((yearOption) => String(yearOption.value) === currentYear);
      return hasCurrentYear ? currentYear : "";
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await linkChildToParent({
        studentName,
        studentPhone,
        gradeLevel,
        tenantSlug: tenantSlug.trim() || undefined,
      });

      if (!result.success) {
        setError(result.message ?? "تعذر إضافة الابن");
        return;
      }

      resetForm();
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setIsOpen(true)} type="button">
          <PlusCircle className="h-4 w-4" />
          إضافة ابن جديد
        </Button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-5 shadow-2xl dark:bg-slate-950 md:p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">إضافة ابن جديد</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  أدخل بيانات الابن كما هي مسجلة. سنحاول أولًا ربط ملف موجود، وإذا لم نجد ملفًا مطابقًا فسيتم إنشاء حساب طالب جديد برقم الهاتف وربطه بحسابك مباشرة.
                </p>
              </div>

              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                onClick={resetForm}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="studentName">اسم الابن</Label>
                  <Input
                    id="studentName"
                    onChange={(event) => {
                      setStudentName(event.target.value);
                      setError("");
                    }}
                    placeholder="مثال: أحمد محمد"
                    value={studentName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentPhone">رقم هاتف الابن</Label>
                  <Input
                    className="font-semibold"
                    dir="ltr"
                    id="studentPhone"
                    inputMode="numeric"
                    maxLength={11}
                    onChange={(event) => {
                      setStudentPhone(event.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder="01XXXXXXXXX"
                    value={studentPhone}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="educationStage">المرحلة الدراسية</Label>
                  <select
                    className={selectClassName}
                    id="educationStage"
                    onChange={(event) => handleEducationStageChange(event.target.value)}
                    value={educationStage}
                  >
                    <option value="">اختر المرحلة الدراسية</option>
                    {EDUCATION_STAGE_OPTIONS.map((stageOption) => (
                      <option key={stageOption.value} value={stageOption.value}>
                        {stageOption.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gradeYear">سنة المرحلة</Label>
                  <select
                    className={selectClassName}
                    disabled={!educationStage}
                    id="gradeYear"
                    onChange={(event) => {
                      setGradeYear(event.target.value);
                      setError("");
                    }}
                    value={gradeYear}
                  >
                    <option value="">{educationStage ? "اختر سنة المرحلة" : "اختر المرحلة الدراسية أولًا"}</option>
                    {gradeYearOptions.map((yearOption) => (
                      <option key={yearOption.value} value={String(yearOption.value)}>
                        {yearOption.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tenantSlug">رابط السنتر</Label>
                  <Input
                    dir="ltr"
                    id="tenantSlug"
                    onChange={(event) => {
                      setTenantSlug(event.target.value.trim().toLowerCase());
                      setError("");
                    }}
                    placeholder="اختياري مثل alamal"
                    value={tenantSlug}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                أدخل اسم الابن ورقم هاتفه والمرحلة ثم السنة الدراسية كما هي في ملف الطالب. وإذا لم يوجد ملف سابق، سيُنشأ حساب طالب جديد بنفس رقم الهاتف داخل الحساب أو السنتر الذي اخترته.
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                اكتب رابط السنتر فقط إذا أردت ربط الابن أو إنشاؤه داخل سنتر محدد بدل الحساب الحالي.
              </div>

              {error ? (
                <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button className="w-full" onClick={resetForm} type="button" variant="outline">
                  إلغاء
                </Button>
                <Button
                  className="w-full gap-2"
                  disabled={isPending || studentPhone.length === 0 || studentName.trim().length < 2 || !gradeLevel}
                  type="submit"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ الإضافة...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      إضافة الابن
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
