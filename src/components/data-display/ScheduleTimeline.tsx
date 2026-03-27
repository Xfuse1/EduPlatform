import { Clock3, MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ScheduleTimelineItem = {
  id: string;
  title: string;
  dayLabel?: string;
  subtitle?: string;
  timeLabel: string;
  location?: string;
  statusLabel?: string;
  accentColor?: string;
};

export function ScheduleTimeline({
  title = "المخطط الزمني",
  items,
}: {
  title?: string;
  items: ScheduleTimelineItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-start">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-start text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            لا توجد عناصر مجدولة بعد.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="relative ps-8">
              {index < items.length - 1 ? <div className="absolute bottom-0 start-[13px] top-10 w-px bg-slate-200 dark:bg-slate-800" /> : null}
              <div className="absolute start-0 top-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white shadow-sm dark:border-slate-950" style={{ backgroundColor: item.accentColor ?? "#1A5276" }} />
              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-start text-base font-bold text-slate-900 dark:text-white">{item.title}</p>
                    {item.subtitle ? <p className="mt-1 text-start text-sm text-slate-500 dark:text-slate-400">{item.subtitle}</p> : null}
                  </div>
                  {item.statusLabel ? <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{item.statusLabel}</span> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                  {item.dayLabel ? <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold dark:bg-slate-900">{item.dayLabel}</span> : null}
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 font-semibold dark:bg-slate-900">
                    <Clock3 className="h-4 w-4" />
                    <span dir="ltr">{item.timeLabel}</span>
                  </span>
                  {item.location ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 font-semibold dark:bg-slate-900">
                      <MapPin className="h-4 w-4" />
                      <span>{item.location}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
