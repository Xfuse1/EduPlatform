'use client';

import { Button } from "@/components/ui/button";

export function ErrorState({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="max-w-md rounded-[20px] border border-slate-200 bg-white p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-2xl text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
          !
        </div>
        <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">حدث خطأ غير متوقع</p>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {error?.message ?? "يرجى المحاولة مرة أخرى بعد قليل"}
        </p>
        {reset ? (
          <Button className="mt-5 w-full" onClick={reset}>
            إعادة المحاولة
          </Button>
        ) : null}
      </div>
    </div>
  );
}
