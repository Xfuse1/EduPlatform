'use client';

import { Link2, Loader2, PlusCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linkChildToParent } from "@/modules/parent/actions";

export function LinkChildForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setStudentName("");
    setStudentPhone("");
    setGradeLevel("");
    setTenantSlug("");
    setError("");
    setIsOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await linkChildToParent({
        studentName,
        studentPhone,
        gradeLevel: gradeLevel.trim(),
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
                    onChange={(event) => setStudentName(event.target.value)}
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
                    onChange={(event) => setStudentPhone(event.target.value.replace(/\D/g, ""))}
                    placeholder="01XXXXXXXXX"
                    value={studentPhone}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">الصف الدراسي</Label>
                  <Input
                    id="gradeLevel"
                    onChange={(event) => setGradeLevel(event.target.value)}
                    placeholder="مثال: ثالثة إعدادي"
                    value={gradeLevel}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenantSlug">رابط السنتر</Label>
                  <Input
                    dir="ltr"
                    id="tenantSlug"
                    onChange={(event) => setTenantSlug(event.target.value.trim().toLowerCase())}
                    placeholder="اختياري مثل alamal"
                    value={tenantSlug}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                أدخل اسم الابن ورقم هاتفه والصف الدراسي كما هي في ملف الطالب. وإذا لم يوجد ملف سابق، سيُنشأ حساب طالب جديد بنفس رقم الهاتف داخل الحساب أو السنتر الذي اخترته.
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
                  disabled={isPending || studentPhone.length === 0 || studentName.trim().length < 2 || gradeLevel.trim().length === 0}
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
