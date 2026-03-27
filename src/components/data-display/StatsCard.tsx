import type { LucideIcon } from "lucide-react";
import { ArrowDownLeft, ArrowUpLeft, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatsCardTone = "ink" | "petrol" | "teal" | "amber" | "rose";

const toneStyles: Record<StatsCardTone, string> = {
  ink: "from-[#132238] to-[#1A5276] text-white",
  petrol: "from-[#1A5276] to-[#2E86C1] text-white",
  teal: "from-[#0F766E] to-[#14B8A6] text-white",
  amber: "from-[#C98512] to-[#E6A819] text-white",
  rose: "from-[#B9385D] to-[#E25D7A] text-white",
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
    <Card className={cn("overflow-hidden border-0 bg-gradient-to-bl shadow-soft", toneStyles[tone])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-start text-sm font-semibold text-white/72">{title}</p>
            <p className="mt-3 text-start text-3xl font-extrabold tracking-tight">{value}</p>
            {hint ? (
              <div className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/14 px-3 py-2 text-xs font-bold">
                <TrendIcon className="h-4 w-4" />
                <span>{hint}</span>
              </div>
            ) : null}
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
