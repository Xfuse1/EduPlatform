'use client';

import { CheckCircle2, ChevronLeft, Sparkles, UserRound } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GroupSelector } from "@/modules/public-pages/components/GroupSelector";
import { registerStudent } from "@/modules/public-pages/actions";

type GroupSummary = {
  id: string;
  name: string;
  days: string[];
  timeStart: string;
  timeEnd: string;
  monthlyFee: number;
  remainingCapacity: number;
  enrolledCount: number;
  maxCapacity: number;
  isFull: boolean;
  color?: string;
};

export function RegistrationForm({ groups }: { groups: GroupSummary[] }) {
  const initialGroupId = groups.find((group) => !group.isFull)?.id ?? "";
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [formValues, setFormValues] = useState({
    studentName: "",
    grade: "",
    parentName: "",
    parentPhone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("groupId", selectedGroupId);

    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await registerStudent(formData);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      setFormValues({
        studentName: "",
        grade: "",
        parentName: "",
        parentPhone: "",
      });
      setSelectedGroupId(initialGroupId);
      setStep(1);
    });
  };

  if (success) {
    return (
      <Card className="overflow-hidden rounded-[32px] border-white/10 bg-white/90 shadow-[0_30px_80px_rgba(7,15,30,0.22)] backdrop-blur dark:border-white/5 dark:bg-slate-900/85">
        <CardContent className="p-8 text-center sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">تم تسجيل الطلب بنجاح</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{success}</p>
          <div className="mt-6 rounded-[24px] border border-slate-200/70 bg-slate-50/90 p-4 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-300">
            سنراجع البيانات ونتواصل معكم لتأكيد الموعد المناسب وإتمام الانضمام.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[32px] border-white/10 bg-white/92 shadow-[0_35px_90px_rgba(8,15,30,0.28)] backdrop-blur dark:border-white/5 dark:bg-slate-900/86">
      <CardHeader className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(18,37,59,0.96)_0%,rgba(28,51,78,0.94)_55%,rgba(37,68,102,0.9)_100%)] px-6 py-7 text-white dark:border-slate-800/70 sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
          <Sparkles className="h-3.5 w-3.5" />
          <span>رحلة تسجيل سريعة ومنظمة</span>
        </div>
        <CardTitle className="mt-4 text-3xl font-extrabold tracking-tight text-white">استمارة التسجيل</CardTitle>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/90">
          خطوتان فقط لإرسال طلب التسجيل واختيار المجموعة الأنسب بشكل واضح ومريح.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div
            className={`rounded-[22px] border px-5 py-4 transition ${
              step === 1
                ? "border-secondary/40 bg-[linear-gradient(135deg,rgba(46,134,193,0.28),rgba(26,82,118,0.18))] shadow-[0_18px_40px_rgba(46,134,193,0.16)]"
                : "border-white/10 bg-white/[0.04] text-white/70"
            }`}
          >
            <p className="text-sm font-bold">١. البيانات الشخصية</p>
            <p className={`mt-2 text-sm ${step === 1 ? "text-white/88" : "text-slate-300/70"}`}>معلومات الطالب وولي الأمر</p>
          </div>

          <div className="hidden h-px min-w-14 bg-gradient-to-l from-transparent via-white/35 to-transparent sm:block" />

          <div
            className={`rounded-[22px] border px-5 py-4 transition ${
              step === 2
                ? "border-secondary/40 bg-[linear-gradient(135deg,rgba(46,134,193,0.28),rgba(26,82,118,0.18))] shadow-[0_18px_40px_rgba(46,134,193,0.16)]"
                : "border-white/10 bg-white/[0.04] text-white/70"
            }`}
          >
            <p className="text-sm font-bold">٢. اختيار المجموعة</p>
            <p className={`mt-2 text-sm ${step === 2 ? "text-white/88" : "text-slate-300/70"}`}>مراجعة السعة والموعد والرسوم</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 bg-[linear-gradient(180deg,rgba(244,248,252,0.95)_0%,rgba(236,243,249,0.9)_100%)] p-6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.75)_0%,rgba(15,23,42,0.88)_100%)] sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/35">
                <div className="mb-5">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">البيانات الأساسية</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أدخل بيانات الطالب وولي الأمر بصياغة واضحة ومرتبة.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-3 text-slate-700 dark:text-slate-100" htmlFor="studentName">
                      اسم الطالب
                    </Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-slate-400" />
                      <Input
                        className="rounded-2xl border-slate-200/80 bg-slate-50/90 ps-10 dark:border-slate-700/80 dark:bg-slate-900/80"
                        id="studentName"
                        name="studentName"
                        onChange={(event) => setFormValues((current) => ({ ...current, studentName: event.target.value }))}
                        placeholder="اكتب اسم الطالب"
                        value={formValues.studentName}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-3 text-slate-700 dark:text-slate-100" htmlFor="grade">
                      الصف الدراسي
                    </Label>
                    <Input
                      className="rounded-2xl border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-900/80"
                      id="grade"
                      name="grade"
                      onChange={(event) => setFormValues((current) => ({ ...current, grade: event.target.value }))}
                      placeholder="مثال: الصف الثالث الثانوي"
                      value={formValues.grade}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-3 text-slate-700 dark:text-slate-100" htmlFor="parentName">
                      اسم ولي الأمر
                    </Label>
                    <Input
                      className="rounded-2xl border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-900/80"
                      id="parentName"
                      name="parentName"
                      onChange={(event) => setFormValues((current) => ({ ...current, parentName: event.target.value }))}
                      placeholder="اكتب اسم ولي الأمر"
                      value={formValues.parentName}
                    />
                  </div>
                  <div>
                    <Label className="mb-3 text-slate-700 dark:text-slate-100" htmlFor="parentPhone">
                      رقم ولي الأمر
                    </Label>
                    <Input
                      className="rounded-2xl border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-900/80"
                      dir="ltr"
                      id="parentPhone"
                      inputMode="numeric"
                      name="parentPhone"
                      onChange={(event) => setFormValues((current) => ({ ...current, parentPhone: event.target.value }))}
                      placeholder="01XXXXXXXXX"
                      value={formValues.parentPhone}
                    />
                  </div>
                </div>
              </div>

              <Button className="w-full gap-2 rounded-2xl py-3.5 text-base shadow-[0_18px_45px_rgba(26,82,118,0.24)]" onClick={() => setStep(2)} type="button">
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-[28px] border border-slate-200/70 bg-white/75 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/35">
                <div className="mb-5">
                  <Label className="mb-0 text-base font-bold text-slate-900 dark:text-white">اختر المجموعة</Label>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">اختر الموعد الأنسب لك من حيث الوقت والسعة والرسوم.</p>
                </div>
                <input name="studentName" type="hidden" value={formValues.studentName} />
                <input name="grade" type="hidden" value={formValues.grade} />
                <input name="parentName" type="hidden" value={formValues.parentName} />
                <input name="parentPhone" type="hidden" value={formValues.parentPhone} />
                <input name="groupId" type="hidden" value={selectedGroupId} />
                <GroupSelector groups={groups} onChange={setSelectedGroupId} selectedGroupId={selectedGroupId} />
              </div>

              {error ? (
                <p className="rounded-[18px] border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  className="w-full rounded-2xl border-slate-300/80 bg-white/80 py-3.5 text-base dark:bg-slate-950/20"
                  onClick={() => setStep(1)}
                  type="button"
                  variant="outline"
                >
                  العودة للبيانات
                </Button>
                <Button className="w-full rounded-2xl py-3.5 text-base shadow-[0_18px_45px_rgba(26,82,118,0.24)]" disabled={isPending || !selectedGroupId} type="submit">
                  {isPending ? "جارٍ إرسال التسجيل..." : "تأكيد التسجيل"}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
