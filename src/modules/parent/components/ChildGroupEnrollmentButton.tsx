'use client';

import { Loader2, Plus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn, formatCapacity, formatCurrency } from "@/lib/utils";
import { enrollChildInGroup } from "@/modules/parent/actions";

type AvailableGroup = {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  room: string | null;
  days: string[];
  timeStart: string;
  timeEnd: string;
  monthlyFee: number;
  enrolledCount: number;
  remainingCapacity: number;
  maxCapacity: number;
  isFull: boolean;
  color: string;
};

type CurrentGroup = {
  id: string;
  name: string;
  subject: string;
};

type ChildGroupEnrollmentButtonProps = {
  childId: string;
  childName: string;
  currentGroups: CurrentGroup[];
  availableGroups: AvailableGroup[];
};

export function ChildGroupEnrollmentButton({
  childId,
  childName,
  currentGroups,
  availableGroups,
}: ChildGroupEnrollmentButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedGroup = useMemo(
    () => availableGroups.find((group) => group.id === selectedGroupId) ?? null,
    [availableGroups, selectedGroupId],
  );

  function closeDialog() {
    setIsOpen(false);
    setSelectedGroupId("");
    setError("");
  }

  function handleSubmit() {
    if (!selectedGroupId) {
      setError("اختر مجموعة أولًا");
      return;
    }

    setError("");

    startTransition(async () => {
      const result = await enrollChildInGroup({
        studentId: childId,
        groupId: selectedGroupId,
      });

      if (!result.success) {
        setError(result.message ?? "تعذر ضم الابن إلى المجموعة");
        return;
      }

      closeDialog();
      router.refresh();
    });
  }

  return (
    <>
      <Button
        className="h-14 rounded-full px-4 text-xs font-bold shadow-sm"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus className="ms-0 h-4 w-4 shrink-0" />
        ضم إلى مجموعة
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-5 shadow-2xl dark:bg-slate-950 md:p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">ضم {childName} إلى مجموعة</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  اختر المجموعة المناسبة للابن. لن تظهر هنا إلا المجموعات المتاحة لنفس الصف الدراسي وغير المنضم إليها بالفعل.
                </p>
              </div>

              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                onClick={closeDialog}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {currentGroups.length ? (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">المجموعات الحالية</p>
                <div className="flex flex-wrap gap-2">
                  {currentGroups.map((group) => (
                    <span
                      key={group.id}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                      {group.name} - {group.subject}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {availableGroups.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                لا توجد مجموعات متاحة حاليًا لهذا الابن في نفس الصف الدراسي.
              </div>
            ) : (
              <div className="space-y-3">
                {availableGroups.map((group) => {
                  const isSelected = selectedGroupId === group.id;

                  return (
                    <button
                      key={group.id}
                      className={cn(
                        "w-full rounded-[22px] border p-4 text-start transition-colors",
                        isSelected
                          ? "border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/30"
                          : "border-slate-200 bg-white hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-700",
                      )}
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setError("");
                      }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-extrabold text-slate-950 dark:text-white">{group.name}</p>
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold text-white"
                              style={{ backgroundColor: group.color }}
                            >
                              {group.subject}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            {group.gradeLevel} - {group.days.join("، ")}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {group.timeStart} - {group.timeEnd}
                            {group.room ? ` - ${group.room}` : ""}
                          </p>
                        </div>

                        <div className="min-w-[132px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-end dark:border-slate-700 dark:bg-slate-950">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">الرسوم</p>
                          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(group.monthlyFee)}</p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {formatCapacity(group.enrolledCount, group.maxCapacity)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                            المتبقي {group.remainingCapacity}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedGroup ? (
              <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                سيتم ضم {childName} إلى مجموعة {selectedGroup.name}.
              </div>
            ) : null}

            {error ? (
              <p className="mt-5 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <Button className="w-full" onClick={closeDialog} type="button" variant="outline">
                إلغاء
              </Button>
              <Button
                className="w-full gap-2"
                disabled={isPending || availableGroups.length === 0 || !selectedGroupId}
                onClick={handleSubmit}
                type="button"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الضم...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    تأكيد الضم
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
