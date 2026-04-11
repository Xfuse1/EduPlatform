'use client';

import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { removeChildFromParent } from "@/modules/parent/actions";

type RemoveChildButtonProps = {
  childId: string;
  childName: string;
};

export function RemoveChildButton({ childId, childName }: RemoveChildButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function closeDialog() {
    if (isPending) {
      return;
    }

    setIsOpen(false);
    setError("");
  }

  function handleRemove() {
    setError("");

    startTransition(async () => {
      const result = await removeChildFromParent({
        studentId: childId,
      });

      if (!result.success) {
        setError(result.message ?? "تعذر حذف الابن الآن");
        return;
      }

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        className="h-14 rounded-full border-rose-200 px-4 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-200 dark:hover:bg-rose-950/30"
        onClick={() => setIsOpen(true)}
        type="button"
        variant="outline"
      >
        <Trash2 className="ms-0 h-4 w-4 shrink-0" />
        حذف الابن
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl dark:bg-slate-950 md:p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">حذف {childName}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  سيتم حذف ملف الابن وبياناته المرتبطة من السنتر نهائيًا. لا يمكن التراجع عن هذه العملية.
                </p>
              </div>

              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                onClick={closeDialog}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error ? (
              <p className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button className="w-full" onClick={closeDialog} type="button" variant="outline">
                إلغاء
              </Button>
              <Button
                className="w-full bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-500"
                disabled={isPending}
                onClick={handleRemove}
                type="button"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    حذف نهائي
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
