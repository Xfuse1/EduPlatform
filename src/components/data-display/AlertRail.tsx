import { AlertTriangle, BellRing, CircleAlert } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AlertItem = {
  id: string;
  title: string;
  description?: string;
  severity: "low" | "medium" | "high";
  meta?: string;
  actionHref?: string;
  actionLabel?: string;
};

const severityStyles = {
  low: {
    card: "border-sky-200 bg-sky-50/80 dark:border-sky-900/50 dark:bg-sky-950/20",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    Icon: BellRing,
  },
  medium: {
    card: "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Icon: CircleAlert,
  },
  high: {
    card: "border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/20",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    Icon: AlertTriangle,
  },
} as const;

export function AlertRail({ title = "ما يحتاج تدخل", items }: { title?: string; items: AlertItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-start">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-start text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            لا توجد تنبيهات تحتاج تدخلاً الآن.
          </div>
        ) : (
          items.map((item) => {
            const config = severityStyles[item.severity];
            const Icon = config.Icon;

            return (
              <div key={item.id} className={cn("rounded-[22px] border p-4", config.card)}>
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", config.icon)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-start text-base font-bold text-slate-900 dark:text-white">{item.title}</p>
                      {item.meta ? <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.meta}</span> : null}
                    </div>
                    {item.description ? <p className="mt-2 text-start text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p> : null}
                    {item.actionHref && item.actionLabel ? (
                      <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900" href={item.actionHref}>
                        {item.actionLabel}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
