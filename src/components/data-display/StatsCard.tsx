import type { LucideIcon } from "lucide-react";
import { ArrowDownLeft, ArrowUpLeft, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatsCardTone = "ink" | "petrol" | "teal" | "amber" | "rose";

const toneStyles: Record<StatsCardTone, string> = {
  ink: "shadow-[0_0_20px_rgba(26,43,109,0.2)]",
  petrol: "shadow-[0_0_20px_rgba(26,43,109,0.2)]",
  teal: "shadow-[0_0_20px_rgba(0,184,160,0.1)]",
  amber: "shadow-[0_0_20px_rgba(245,166,35,0.1)]",
  rose: "shadow-[0_0_20px_rgba(232,96,76,0.1)]",
};

const toneColors: Record<StatsCardTone, string> = {
  ink: "text-[#FFFFFF]",
  petrol: "text-[#FFFFFF]",
  teal: "text-[#00B8A0]",
  amber: "text-[#F5A623]",
  rose: "text-[#E8604C]",
};

export function StatsCard({
  title,
  value,
  hint,
  tone = "ink",
  icon: Icon = Sparkles,
  trend = "neutral",
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: StatsCardTone;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
}) {
  const TrendIcon = trend === "down" ? ArrowDownLeft : ArrowUpLeft;

  return (
    <Card className={cn("overflow-hidden border border-slate-200 bg-white/50 backdrop-blur-[16px] rounded-[16px] text-slate-900 dark:text-white dark:border-border-soft dark:bg-surface shadow-sm", toneStyles[tone])}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-start text-sm font-bold text-slate-500 dark:text-[#94A3B8]">{title}</p>
            <p className={cn("mt-3 break-words text-start text-2xl font-extrabold tracking-tight sm:text-3xl", toneColors[tone])}>{value}</p>
            {hint ? (
              <div className="mt-4 inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600 dark:bg-white/10 dark:text-white/80">
                <TrendIcon className={cn("h-4 w-4", toneColors[tone])} />
                <span className="min-w-0 truncate">{hint}</span>
              </div>
            ) : null}
          </div>
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] dark:bg-white/10 sm:h-14 sm:w-14 sm:rounded-[20px]", toneColors[tone])}>
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
