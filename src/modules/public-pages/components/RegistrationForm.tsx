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
  const [selectedGroupId, setSelectedGroupId] = useState(groups.find((group) => !group.isFull)?.id ?? "");
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
      form.reset();
    });
  };

  if (success) {
    return (
      <Card className="overflow-hidden rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] shadow-[0_30px_80px_rgba(7,15,30,0.22)] backdrop-blur-[16px]">
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
    <Card 
      className="overflow-hidden border-slate-200 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/5 dark:shadow-[0_0_60px_rgba(0,184,160,0.08)] rounded-[20px]"
    >
      <CardHeader className="border-b border-slate-100 dark:border-white/[0.08] px-6 py-7 text-slate-900 dark:text-white sm:px-8">
        <div className="mx-auto mb-6 flex h-[48px] w-[48px] items-center justify-center">
          <img alt="Logo" className="h-full w-full object-contain" src="/images/logo.svg" />
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-[#00B8A0]" />
            <span>رحلة تسجيل سريعة ومنظمة</span>
          </div>
          <CardTitle className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">استمارة التسجيل</CardTitle>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#94A3B8]">
            خطوتان فقط لإرسال طلب التسجيل واختيار المجموعة الأنسب بشكل واضح ومريح.
          </p>
        </div>


        <div className="mt-7 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div
            className={`rounded-[22px] border px-5 py-4 transition ${
              step === 1
                ? "border-[#00B8A0]/40 bg-[#00B8A0]/10 shadow-[0_18px_40px_rgba(0,184,160,0.12)]"
                : "border-white/10 bg-white/[0.04] text-white/70"
            }`}
          >
            <p className="text-sm font-bold">١. البيانات الشخصية</p>
            <p className={`mt-2 text-sm ${step === 1 ? "text-white" : "text-[#94A3B8]"}`}>معلومات الطالب وولي الأمر</p>
          </div>

          <div className="hidden h-px min-w-14 bg-gradient-to-l from-transparent via-white/35 to-transparent sm:block" />

          <div
            className={`rounded-[22px] border px-5 py-4 transition ${
              step === 2
                ? "border-[#00B8A0]/40 bg-[#00B8A0]/10 shadow-[0_18px_40px_rgba(0,184,160,0.12)]"
                : "border-white/10 bg-white/[0.04] text-white/70"
            }`}
          >
            <p className="text-sm font-bold">٢. اختيار المجموعة</p>
            <p className={`mt-2 text-sm ${step === 2 ? "text-white" : "text-[#94A3B8]"}`}>مراجعة السعة والموعد والرسوم</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 bg-transparent p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
                <div className="mb-5">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">البيانات الأساسية</p>
                  <p className="mt-1 text-sm text-[#94A3B8]">أدخل بيانات الطالب وولي الأمر بصياغة واضحة ومرتبة.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-3 text-slate-700 dark:text-white" htmlFor="studentName">
                      اسم الطالب
                    </Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-[#94A3B8]" />
                      <Input
                        className="rounded-[10px] border-slate-200 bg-slate-100/50 dark:border-white/10 dark:bg-white/5 ps-10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0]"
                        id="studentName"
                        name="studentName"
                        placeholder="اكتب اسم الطالب"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-3 text-slate-700 dark:text-white" htmlFor="grade">
                      الصف الدراسي
                    </Label>
                    <Input
                      className="rounded-[10px] border-slate-200 bg-slate-100/50 dark:border-white/10 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0]"
                      id="grade"
                      name="grade"
                      placeholder="مثال: الصف الثالث الثانوي"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-3 text-slate-700 dark:text-white" htmlFor="parentName">
                      اسم ولي الأمر
                    </Label>
                    <Input
                      className="rounded-[10px] border-slate-200 bg-slate-100/50 dark:border-white/10 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0]"
                      id="parentName"
                      name="parentName"
                      placeholder="اكتب اسم ولي الأمر"
                    />
                  </div>
                  <div>
                    <Label className="mb-3 text-slate-700 dark:text-white" htmlFor="parentPhone">
                      رقم ولي الأمر
                    </Label>
                    <Input
                      className="rounded-[10px] border-slate-200 bg-slate-100/50 dark:border-white/10 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus-visible:ring-[#00B8A0]/15 focus-visible:border-[#00B8A0]"
                      dir="ltr"
                      id="parentPhone"
                      inputMode="numeric"
                      name="parentPhone"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <Button 
                className="w-full gap-2 rounded-[10px] py-3.5 text-base bg-[linear-gradient(135deg,#00B8A0,#1A2B6D)] hover:bg-[linear-gradient(135deg,#00c4ab,#1e3480)] hover:-translate-y-[1px] transition-all text-white border-0" 
                onClick={() => setStep(2)} 
                type="button"
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
                <div className="mb-5">
                  <Label className="mb-0 text-base font-bold text-slate-900 dark:text-white">اختر المجموعة</Label>
                  <p className="mt-1 text-sm text-[#94A3B8]">اختر الموعد الأنسب لك من حيث الوقت والسعة والرسوم.</p>
                </div>
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
                  className="w-full rounded-[10px] border-white/10 bg-white/5 py-3.5 text-base text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all"
                  onClick={() => setStep(1)}
                  type="button"
                  variant="outline"
                >
                  العودة للبيانات
                </Button>
                <Button 
                  className="w-full rounded-[10px] py-3.5 text-base bg-[linear-gradient(135deg,#00B8A0,#1A2B6D)] hover:bg-[linear-gradient(135deg,#00c4ab,#1e3480)] hover:-translate-y-[1px] transition-all text-white border-0" 
                  disabled={isPending || !selectedGroupId} 
                  type="submit"
                >
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
