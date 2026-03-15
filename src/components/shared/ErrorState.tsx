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
      <div className="max-w-md rounded-3xl border bg-white p-6 text-center shadow-soft">
        <p className="text-lg font-bold text-slate-900">حدث خطأ غير متوقع</p>
        <p className="mt-3 text-sm text-slate-600">{error?.message ?? "يرجى المحاولة مرة أخرى بعد قليل"}</p>
        {reset ? (
          <Button className="mt-5 w-full" onClick={reset}>
            إعادة المحاولة
          </Button>
        ) : null}
      </div>
    </div>
  );
}
