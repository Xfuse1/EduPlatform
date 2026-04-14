'use client';

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
}

export function Header({
  tenantName,
  userName,
  avatarUrl,
  onMenuToggle,
}: {
  tenantName: string;
  userName: string;
  avatarUrl?: string | null;
  onMenuToggle?: () => void;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/30 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-slate-950/20">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-extrabold text-white shadow-lg shadow-primary/20 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              getInitials(userName)
            )}
          </div>

          {onMenuToggle && (
            <button
              type="button"
              aria-label="فتح القائمة الجانبية"
              onClick={onMenuToggle}
              className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-secondary/40 hover:text-primary xl:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            aria-label="تسجيل خروج"
            onClick={handleLogout}
            className="touch-target inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <div className="text-end">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">المعلم</p>
            <h1 className="text-base font-extrabold text-primary dark:text-sky-300">{tenantName}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}
