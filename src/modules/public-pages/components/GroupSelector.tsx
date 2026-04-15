import { BookOpen, CheckCircle2, Clock3, GraduationCap, Users } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn, formatCapacity, formatCurrency, formatTimeRange12Hour, toArabicDigits } from "@/lib/utils";

type GroupOption = {
  id: string;
  name: string;
  subject?: string;
  gradeLevel?: string;
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

export function GroupSelector({
  groups,
  selectedGroupId,
  onChange,
}: {
  groups: GroupOption[];
  selectedGroupId: string;
  onChange: (groupId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const progress = Math.round((group.enrolledCount / group.maxCapacity) * 100);
        const isSelected = selectedGroupId === group.id;
        const subjectLabel = group.subject?.trim() || "المادة غير محددة";
        const gradeLevelLabel = group.gradeLevel?.trim() || "الصف غير محدد";

        return (
          <button
            key={group.id}
            className={cn(
              "touch-target relative w-full overflow-hidden rounded-[26px] border p-5 text-start transition duration-300",
              "bg-[linear-gradient(180deg,rgba(10,20,39,0.96)_0%,rgba(13,24,45,0.98)_100%)] shadow-[0_22px_55px_rgba(3,10,25,0.22)]",
              isSelected
                ? "border-secondary shadow-[0_32px_80px_rgba(46,134,193,0.24)] ring-2 ring-secondary/35"
                : "border-slate-700/80 hover:-translate-y-0.5 hover:border-secondary/55 hover:shadow-[0_28px_65px_rgba(3,10,25,0.28)]",
              group.isFull && "cursor-not-allowed opacity-60",
            )}
            disabled={group.isFull}
            onClick={() => onChange(group.id)}
            type="button"
          >
            {isSelected ? (
              <>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(46,134,193,0.14),transparent_30%),linear-gradient(180deg,rgba(46,134,193,0.08),transparent_40%)]" />
                <div className="pointer-events-none absolute inset-x-5 top-4 bottom-4 rounded-[22px] border border-secondary/20" />
              </>
            ) : null}

            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-transparent via-white/25 to-transparent" />
            <div className="mb-5 h-1.5 rounded-full" style={{ backgroundColor: group.color ?? "#1A5276" }} />

            <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className={cn("text-xl font-extrabold tracking-tight text-white", isSelected && "text-sky-100")}>{group.name}</p>
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold text-white"
                        style={{ backgroundColor: group.color ?? "#1A5276" }}
                      >
                        {subjectLabel}
                      </span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-white shadow-[0_10px_30px_rgba(46,134,193,0.35)]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>المجموعة المختارة</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <GraduationCap className="h-4 w-4 text-sky-300" />
                      <span>{gradeLevelLabel}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-400">اختيار منظم وهادئ مع توضيح كامل للسعة والموعد قبل التأكيد.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.days.map((day) => (
                    <span
                      key={day}
                      className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-200"
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="flex items-center gap-2 rounded-2xl border border-white/6 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
                    <Clock3 className="h-4 w-4 text-sky-300" />
                    <span dir="ltr">
                      {formatTimeRange12Hour(group.timeStart, group.timeEnd)}
                    </span>
                  </p>

                  <div className="rounded-2xl border border-white/6 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-sky-300" />
                        <span>السعة الحالية</span>
                      </span>
                      <span dir="ltr" className="font-semibold text-slate-100">
                        {formatCapacity(group.enrolledCount, group.maxCapacity)}
                      </span>
                    </div>
                    <Progress className="h-2 bg-white/10" value={progress} />
                  </div>
                </div>

                <div className="grid gap-3">
                  <p className="flex items-center gap-2 rounded-2xl border border-white/6 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
                    <BookOpen className="h-4 w-4 text-sky-300" />
                    <span>{subjectLabel}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)] p-4 text-end">
                <p className="text-xs font-semibold tracking-wide text-slate-400">الرسوم الشهرية</p>
                <p className="mt-2 text-3xl font-extrabold text-sky-300">{formatCurrency(group.monthlyFee)}</p>

                <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400">المقاعد المتبقية</p>
                <p className="mt-2 text-lg font-bold text-slate-100">
                  <span dir="ltr">{toArabicDigits(group.remainingCapacity)}</span>
                </p>

                <div className="mt-5 rounded-2xl border border-white/6 bg-white/[0.04] px-3 py-3 text-center">
                  <p className="text-xs text-slate-400">حالة المجموعة</p>
                  <p className={cn("mt-1 text-sm font-bold", group.isFull ? "text-rose-300" : "text-emerald-300")}>
                    {group.isFull ? "المجموعة ممتلئة حاليا" : "متاحة للتسجيل"}
                  </p>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

