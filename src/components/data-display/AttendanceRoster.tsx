import { CheckCircle2, Clock3, MinusCircle, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AttendanceRosterItem = {
  id: string;
  name: string;
  attendanceStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  paymentStatus?: "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";
  groupName?: string;
  note?: string;
};

function attendanceMeta(status: AttendanceRosterItem["attendanceStatus"]) {
  switch (status) {
    case "PRESENT":
      return { label: "حاضر", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300", Icon: CheckCircle2 };
    case "LATE":
      return { label: "متأخر", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300", Icon: Clock3 };
    case "EXCUSED":
      return { label: "بعذر", className: "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300", Icon: MinusCircle };
    default:
      return { label: "غائب", className: "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300", Icon: MinusCircle };
  }
}

function paymentMeta(status?: AttendanceRosterItem["paymentStatus"]) {
  switch (status) {
    case "PAID":
      return "مدفوع";
    case "PARTIAL":
      return "جزئي";
    case "OVERDUE":
      return "متأخر";
    case "PENDING":
      return "معلق";
    default:
      return "غير محدد";
  }
}

export function AttendanceRoster({ title = "كشف الحضور", items }: { title?: string; items: AttendanceRosterItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-start">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-start text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            لا توجد بيانات حضور متاحة لهذه الحصة.
          </div>
        ) : (
          items.map((item) => {
            const meta = attendanceMeta(item.attendanceStatus);
            const Icon = meta.Icon;

            return (
              <div key={item.id} className="rounded-[20px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-start text-base font-bold text-slate-900 dark:text-white">{item.name}</p>
                    {item.groupName ? <p className="mt-1 text-start text-sm text-slate-500 dark:text-slate-400">{item.groupName}</p> : null}
                    {item.note ? <p className="mt-2 text-start text-sm text-slate-600 dark:text-slate-300">{item.note}</p> : null}
                  </div>
                  <span className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${meta.className}`}>
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <Wallet className="h-4 w-4" />
                  حالة التحصيل: {paymentMeta(item.paymentStatus)}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
