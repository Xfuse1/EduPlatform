import { WifiOff } from "lucide-react";

export function OfflineState({
  title = "يوجد عناصر بانتظار المزامنة",
  message = "تم حفظ آخر العمليات محليًا وسيتم إرسالها تلقائيًا بمجرد استقرار الاتصال.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4 text-start dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <WifiOff className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-bold text-amber-900 dark:text-amber-200">{title}</p>
          <p className="mt-2 text-sm leading-7 text-amber-800 dark:text-amber-300">{message}</p>
        </div>
      </div>
    </div>
  );
}
