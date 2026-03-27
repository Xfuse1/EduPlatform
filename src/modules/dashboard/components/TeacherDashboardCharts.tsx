"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  month: string;
  revenue?: number;
  rate?: number;
};

function toArabicDigits(value: number | string) {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  return String(value).replace(/\d/g, (digit) => arabicDigits[Number(digit)] ?? digit);
}

function formatCurrencyLabel(value: number) {
  return `${toArabicDigits(value)} جنيه`;
}

function formatPercentageLabel(value: number) {
  return `${toArabicDigits(value)}%`;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  formatter: (value: number) => string;
}) {
  if (!active || !payload?.length || typeof payload[0]?.value !== "number") {
    return null;
  }

  return (
    <div
      className="rounded-2xl border px-4 py-3 text-sm shadow-xl"
      style={
        {
          backgroundColor: "var(--chart-tooltip-bg)",
          borderColor: "var(--chart-tooltip-border)",
          color: "var(--chart-text)",
        } satisfies CSSProperties
      }
    >
      <p className="text-start font-bold">{label}</p>
      <p className="mt-2 text-start">{formatter(payload[0].value)}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="rounded-[16px] p-5 shadow-[0_8px_30px_rgba(15,23,42,0.08)]"
      style={{ backgroundColor: "var(--chart-card-bg)" }}
    >
      <h2 className="text-start text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-4 h-[200px] w-full">{children}</div>
    </div>
  );
}

export function TeacherDashboardCharts({
  revenueData,
  attendanceData,
}: {
  revenueData: ChartPoint[];
  attendanceData: ChartPoint[];
}) {
  const axisStyle = { fill: "var(--chart-text)", fontSize: 12 };

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="إيرادات آخر 6 أشهر">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="month" tick={axisStyle} tickLine={false} />
            <YAxis
              axisLine={false}
              tick={axisStyle}
              tickFormatter={(value: number) => formatCurrencyLabel(value)}
              tickLine={false}
              width={88}
            />
            <Tooltip content={<ChartTooltip formatter={(value) => `الإيرادات: ${formatCurrencyLabel(value)}`} />} />
            <Area
              dataKey="revenue"
              fill="var(--chart-primary-fill)"
              stroke="var(--chart-primary)"
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="نسبة الحضور الشهرية">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={attendanceData} margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="month" tick={axisStyle} tickLine={false} />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              tickMargin={12}
              tick={axisStyle}
              tickFormatter={(value: number) => formatPercentageLabel(value)}
              tickLine={false}
              width={72}
            />
            <Tooltip content={<ChartTooltip formatter={(value) => `نسبة الحضور: ${formatPercentageLabel(value)}`} />} />
            <Bar dataKey="rate" fill="var(--chart-success)" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}
