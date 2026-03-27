import { CalendarClock, ReceiptText } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type InvoiceStatus = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

function statusMeta(status: InvoiceStatus) {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "PARTIAL":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    case "OVERDUE":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200";
  }
}

function statusLabel(status: InvoiceStatus) {
  switch (status) {
    case "PAID":
      return "مدفوع";
    case "PARTIAL":
      return "جزئي";
    case "OVERDUE":
      return "متأخر";
    default:
      return "معلق";
  }
}

export function InvoiceCard({
  invoiceNumber,
  amount,
  dueDateLabel,
  description,
  status,
  actionHref,
  actionLabel,
}: {
  invoiceNumber: string;
  amount: number;
  dueDateLabel: string;
  description: string;
  status: InvoiceStatus;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-start text-sm font-semibold text-slate-500 dark:text-slate-400">#{invoiceNumber}</p>
            <p className="mt-2 text-start text-xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(amount)}</p>
          </div>
          <span className={`rounded-full px-3 py-2 text-xs font-bold ${statusMeta(status)}`}>{statusLabel(status)}</span>
        </div>

        <p className="text-start text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>

        <div className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <CalendarClock className="h-4 w-4" />
          {dueDateLabel}
        </div>

        {actionHref && actionLabel ? (
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900" href={actionHref}>
            <ReceiptText className="h-4 w-4" />
            {actionLabel}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
