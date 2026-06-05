import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-l from-primary to-secondary transition-all"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
