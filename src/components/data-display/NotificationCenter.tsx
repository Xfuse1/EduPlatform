import { BellRing, CheckCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationCenterItem = {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  channelLabel?: string;
  isUnread?: boolean;
};

export function NotificationCenter({
  title = "مركز التنبيهات",
  items,
}: {
  title?: string;
  items: NotificationCenterItem[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-start">{title}</CardTitle>
        <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary dark:bg-sky-400/10 dark:text-sky-300">
          <CheckCheck className="h-4 w-4" />
          {items.length} تحديث
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-start text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            لا توجد إشعارات جديدة.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-[18px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start gap-3">
                <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-2xl ${item.isUnread ? "bg-primary/10 text-primary dark:bg-sky-400/10 dark:text-sky-300" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>
                  <BellRing className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-start text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.timeLabel}</span>
                  </div>
                  <p className="mt-2 text-start text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
                  {item.channelLabel ? <p className="mt-2 text-start text-xs font-semibold text-slate-500 dark:text-slate-400">القناة: {item.channelLabel}</p> : null}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
