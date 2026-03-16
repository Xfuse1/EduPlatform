'use client';

import { Clock3, Pencil, Plus, Users, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatCapacity, formatCurrency, toArabicDigits } from "@/lib/utils";

type GroupItem = {
  id: string;
  name: string;
  subject: string;
  days: string[];
  timeStart: string;
  timeEnd: string;
  monthlyFee: number;
  maxCapacity: number;
  enrolledCount: number;
  color: string;
};

export function GroupsPageClient({ initialGroups }: { initialGroups: GroupItem[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [capacity, setCapacity] = useState("");

  const resetForm = () => {
    setName("");
    setSubject("");
    setDays("");
    setTimeStart("");
    setTimeEnd("");
    setMonthlyFee("");
    setCapacity("");
    setEditingGroupId(null);
    setIsOpen(false);
  };

  const openCreateDialog = () => {
    setName("");
    setSubject("");
    setDays("");
    setTimeStart("");
    setTimeEnd("");
    setMonthlyFee("");
    setCapacity("");
    setEditingGroupId(null);
    setIsOpen(true);
  };

  const openEditDialog = (group: GroupItem) => {
    setName(group.name);
    setSubject(group.subject);
    setDays(group.days.join(" - "));
    setTimeStart(group.timeStart);
    setTimeEnd(group.timeEnd);
    setMonthlyFee(String(group.monthlyFee));
    setCapacity(String(group.maxCapacity));
    setEditingGroupId(group.id);
    setIsOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !subject.trim() || !days.trim() || !timeStart.trim() || !timeEnd.trim() || !monthlyFee.trim() || !capacity.trim()) {
      return;
    }

    if (editingGroupId) {
      setGroups((current) =>
        current.map((group) =>
          group.id === editingGroupId
            ? {
                ...group,
                name: name.trim(),
                subject: subject.trim(),
                days: days.split("-").map((day) => day.trim()).filter(Boolean),
                timeStart: timeStart.trim(),
                timeEnd: timeEnd.trim(),
                monthlyFee: Number(monthlyFee),
                maxCapacity: Number(capacity),
              }
            : group,
        ),
      );
      resetForm();
      return;
    }

    setGroups((current) => [
      {
        id: `group-${current.length + 1}`,
        name: name.trim(),
        subject: subject.trim(),
        days: days.split("-").map((day) => day.trim()).filter(Boolean),
        timeStart: timeStart.trim(),
        timeEnd: timeEnd.trim(),
        monthlyFee: Number(monthlyFee),
        maxCapacity: Number(capacity),
        enrolledCount: 0,
        color: "#2E86C1",
      },
      ...current,
    ]);

    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/70 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">المجموعات</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">عرض منظم للمجموعات مع السعة والجدول والرسوم.</p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <Button className="w-full gap-2 sm:w-auto" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            إنشاء مجموعة جديدة
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400">أضف مجموعة جديدة وستظهر مباشرة في القائمة أدناه.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const progress = Math.round((group.enrolledCount / group.maxCapacity) * 100);

          return (
            <Card key={group.id} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: group.color }} />
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{group.name}</h2>
                    <p className="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: group.color }}>
                      {group.subject}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary dark:text-sky-300">{formatCurrency(group.monthlyFee)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.days.map((day) => (
                    <span
                      key={`${group.id}-${day}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Clock3 className="h-4 w-4" />
                  <span dir="ltr">
                    {group.timeStart} - {group.timeEnd}
                  </span>
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      عدد الطلاب
                    </span>
                    <span dir="ltr">{formatCapacity(group.enrolledCount, group.maxCapacity)}</span>
                  </div>
                  <Progress className="h-2.5" value={progress} />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    المتبقي <span dir="ltr">{toArabicDigits(group.maxCapacity - group.enrolledCount)}</span> مقعد
                  </p>
                </div>

                <Button className="w-full gap-2" onClick={() => openEditDialog(group)} type="button" variant="outline">
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)] dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {editingGroupId ? "تعديل المجموعة" : "إنشاء مجموعة جديدة"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {editingGroupId ? "حدّث بيانات المجموعة وسيتم تعديل البطاقة مباشرة." : "أضف مجموعة وستظهر مباشرة داخل الصفحة."}
                </p>
              </div>
              <button
                aria-label="إغلاق"
                className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700"
                onClick={resetForm}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">اسم المجموعة</label>
                <Input onChange={(event) => setName(event.target.value)} placeholder="مثال: أولى ثانوي - الإثنين" value={name} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">المادة</label>
                <Input onChange={(event) => setSubject(event.target.value)} placeholder="رياضيات" value={subject} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">الأيام</label>
                <Input onChange={(event) => setDays(event.target.value)} placeholder="الأحد - الثلاثاء" value={days} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">من</label>
                <Input dir="ltr" onChange={(event) => setTimeStart(event.target.value)} placeholder="05:00 PM" value={timeStart} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">إلى</label>
                <Input dir="ltr" onChange={(event) => setTimeEnd(event.target.value)} placeholder="07:00 PM" value={timeEnd} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">الرسوم</label>
                <Input dir="ltr" inputMode="numeric" onChange={(event) => setMonthlyFee(event.target.value.replace(/\D/g, ""))} placeholder="400" value={monthlyFee} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">السعة</label>
                <Input dir="ltr" inputMode="numeric" onChange={(event) => setCapacity(event.target.value.replace(/\D/g, ""))} placeholder="24" value={capacity} />
              </div>
              <div className="flex gap-3 md:col-span-2">
                <Button className="w-full" type="submit">
                  {editingGroupId ? "حفظ التعديلات" : "حفظ المجموعة"}
                </Button>
                <Button className="w-full" onClick={resetForm} type="button" variant="outline">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
