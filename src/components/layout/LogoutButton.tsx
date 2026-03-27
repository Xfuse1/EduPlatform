'use client';

import { Loader2, LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      className="min-h-11 gap-2 rounded-2xl px-3 sm:px-4"
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
      <span className="hidden sm:inline">تسجيل الخروج</span>
    </Button>
  );
}
