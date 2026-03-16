import { Clock3, Users } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn, formatCapacity, formatCurrency, toArabicDigits } from "@/lib/utils";

type GroupOption = {
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
    <div className="space-y-3">
      {groups.map((group) => {
        const progress = Math.round((group.enrolledCount / group.maxCapacity) * 100);

        return (
          <button
            key={group.id}
            className={cn(
              "touch-target w-full rounded-[20px] border bg-white p-4 text-start transition dark:bg-slate-900",
              selectedGroupId === group.id ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-secondary",
              group.isFull && "cursor-not-allowed opacity-60",
            )}
            disabled={group.isFull}
            onClick={() => onChange(group.id)}
            type="button"
          >
            <div className="mb-4 h-1.5 rounded-full" style={{ backgroundColor: group.color ?? "#1A5276" }} />
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-base font-bold text-slate-900 dark:text-white">{group.name}</p>
                <div className="flex flex-wrap gap-2">
                  {group.days.map((day) => (
                    <span
                      key={day}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  <span dir="ltr">
                    {group.timeStart} - {group.timeEnd}
                  </span>
                </p>
              </div>

              <div className="text-end">
                <p className="text-base font-extrabold text-primary dark:text-sky-300">{formatCurrency(group.monthlyFee)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  متبقي <span dir="ltr">{toArabicDigits(group.remainingCapacity)}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>السعة الحالية</span>
                </span>
                <span dir="ltr">{formatCapacity(group.enrolledCount, group.maxCapacity)}</span>
              </div>
              <Progress className="h-2.5" value={progress} />
            </div>

            {group.isFull ? (
              <p className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-300">المجموعة ممتلئة حالياً</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
