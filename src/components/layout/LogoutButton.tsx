'use client';

import { Loader2, LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      className="min-h-11 gap-2 rounded-2xl border-rose-200 bg-rose-50 px-3 text-rose-700 hover:bg-rose-100 hover:text-rose-800 sm:px-4 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          window.location.assign("/api/auth/logout");
        });
      }}
      type="button"
      variant="outline"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span>تسجيل خروج</span>
    </Button>
  );
}
