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
    <Card className={cn("overflow-hidden border border-slate-200 bg-white/50 backdrop-blur-[16px] rounded-[16px] text-slate-900 dark:text-white dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.05)] shadow-sm", toneStyles[tone])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-start text-sm font-bold text-slate-500 dark:text-[#94A3B8]">{title}</p>
            <p className={cn("mt-3 text-start text-3xl font-extrabold tracking-tight", toneColors[tone])}>{value}</p>
            {hint ? (
              <div className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-100 dark:bg-white/10 px-3 py-2 text-xs font-extrabold text-slate-600 dark:text-white/80">
                <TrendIcon className={cn("h-4 w-4", toneColors[tone])} />
                <span>{hint}</span>
              </div>
            ) : null}
          </div>
          <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-slate-100 dark:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]", toneColors[tone])}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
