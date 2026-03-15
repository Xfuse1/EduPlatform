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
      {groups.map((group) => (
        <button
          key={group.id}
          className={cn(
            "touch-target w-full rounded-3xl border bg-white p-4 text-start transition",
            selectedGroupId === group.id ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-secondary",
            group.isFull && "cursor-not-allowed opacity-60",
          )}
          disabled={group.isFull}
          onClick={() => onChange(group.id)}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-900">{group.name}</p>
              <p className="mt-1 text-sm text-slate-600">{group.days.join(" • ")}</p>
              <p className="mt-1 text-sm text-slate-500">
                <span dir="ltr">
                  {group.timeStart} - {group.timeEnd}
                </span>
              </p>
            </div>
            <div className="text-end">
              <p className="text-sm font-semibold text-primary">{formatCurrency(group.monthlyFee)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatCapacity(group.enrolledCount, group.maxCapacity)}</p>
              <p className="mt-1 text-xs text-slate-500">
                متبقي <span dir="ltr">{toArabicDigits(group.remainingCapacity)}</span>
              </p>
            </div>
          </div>
          {group.isFull ? (
            <p className="mt-3 text-sm font-semibold text-rose-600">المجموعة ممتلئة</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}
