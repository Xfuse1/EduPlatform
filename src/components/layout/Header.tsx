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
  onMenuToggle,
}: {
  tenantName: string;
  userName: string;
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

        {/* Left side: avatar + menu toggle + logout */}
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-extrabold text-white shadow-lg shadow-primary/20">
            {getInitials(userName)}
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
            aria-label="تسجيل الخروج"
            onClick={handleLogout}
            className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-rose-300 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Right side: tenant name + notifications + theme toggle */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <div className="text-end">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">اسم السنتر</p>
            <h1 className="text-base font-extrabold text-primary dark:text-sky-300">{tenantName}</h1>
          </div>
        </div>

      </div>
    </header>
  );
}
