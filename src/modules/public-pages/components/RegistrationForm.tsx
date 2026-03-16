'use client';

import { CheckCircle2, ChevronLeft, UserRound } from "lucide-react";
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
      <Card className="overflow-hidden rounded-[24px]">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">تم تسجيل الطلب بنجاح</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{success}</p>
          <div className="mt-6 rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            سنراجع البيانات ونتواصل معكم لتأكيد الموعد المناسب وإتمام الانضمام.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-[24px]">
      <CardHeader className="bg-[linear-gradient(135deg,_rgba(26,82,118,0.12),_rgba(46,134,193,0.18))]">
        <CardTitle>استمارة التسجيل</CardTitle>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">خطوتان فقط لإرسال طلب التسجيل واختيار المجموعة الأنسب.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className={`rounded-[16px] p-4 ${step === 1 ? "bg-primary text-white" : "bg-white/70 dark:bg-slate-900/70"}`}>
            <p className="text-sm font-bold">١. البيانات الشخصية</p>
            <p className={`mt-2 text-sm ${step === 1 ? "text-white/85" : "text-slate-500 dark:text-slate-400"}`}>معلومات الطالب وولي الأمر</p>
          </div>
          <div className={`rounded-[16px] p-4 ${step === 2 ? "bg-primary text-white" : "bg-white/70 dark:bg-slate-900/70"}`}>
            <p className="text-sm font-bold">٢. اختيار المجموعة</p>
            <p className={`mt-2 text-sm ${step === 2 ? "text-white/85" : "text-slate-500 dark:text-slate-400"}`}>مراجعة السعة والموعد والرسوم</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="studentName">اسم الطالب</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-slate-400" />
                    <Input className="ps-10" id="studentName" name="studentName" placeholder="اكتب اسم الطالب" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="grade">الصف الدراسي</Label>
                  <Input id="grade" name="grade" placeholder="مثال: الصف الثالث الثانوي" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="parentName">اسم ولي الأمر</Label>
                  <Input id="parentName" name="parentName" placeholder="اكتب اسم ولي الأمر" />
                </div>
                <div>
                  <Label htmlFor="parentPhone">رقم ولي الأمر</Label>
                  <Input dir="ltr" id="parentPhone" inputMode="numeric" name="parentPhone" placeholder="01XXXXXXXXX" />
                </div>
              </div>

              <Button className="w-full gap-2" onClick={() => setStep(2)} type="button">
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label>اختر المجموعة</Label>
                <input name="groupId" type="hidden" value={selectedGroupId} />
                <GroupSelector groups={groups} onChange={setSelectedGroupId} selectedGroupId={selectedGroupId} />
              </div>

              {error ? (
                <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="w-full" onClick={() => setStep(1)} type="button" variant="outline">
                  العودة للبيانات
                </Button>
                <Button className="w-full" disabled={isPending || !selectedGroupId} type="submit">
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
