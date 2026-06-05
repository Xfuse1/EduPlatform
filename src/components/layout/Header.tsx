'use client';

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { TeacherShareButton } from "@/components/layout/TeacherShareButton";

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
  tenantSlug,
  userName,
  avatarUrl,
  role,
  hasSubscription,
  onMenuToggle,
}: {
  tenantName: string;
  tenantSlug?: string;
  userName: string;
  avatarUrl?: string | null;
  role?: "teacher" | "student" | "parent";
  hasSubscription?: boolean;
  onMenuToggle?: () => void;
}) {
  const router = useRouter();
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  // Render the avatar whenever we have a URL; rely on the <img> onError
  // fallback to show initials if the image fails to load.
  const resolvedAvatarUrl = !avatarFailed ? avatarUrl ?? null : null;

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } catch {
      // Network/server error: keep the user on the page so they can retry
      // rather than appearing logged out while the session may still be valid.
    }
  };

  return (
    <header className="sticky top-0 z-30 min-h-16 border-b border-slate-200 bg-white/80 backdrop-blur-[20px] shadow-sm dark:border-white/10 dark:bg-[#0D1B2A]/85">
      <div className="flex min-h-16 items-center justify-between gap-1.5 px-2.5 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/90 p-1 text-sm font-extrabold text-primary shadow-lg shadow-primary/20 dark:bg-slate-900 sm:flex">
            {resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt={userName} className="h-full w-full rounded-xl object-contain" onError={() => setAvatarFailed(true)} />
            ) : (
              <span className="grid h-full w-full place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white">
                {getInitials(userName)}
              </span>
            )}
          </div>

          {onMenuToggle && (
            <button
              type="button"
              aria-label="فتح القائمة الجانبية"
              onClick={onMenuToggle}
              className="touch-target inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[#00B8A0]/50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 sm:min-h-11 sm:min-w-11 sm:rounded-2xl xl:hidden"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}

          <button
            type="button"
            aria-label="تسجيل خروج"
            onClick={handleLogout}
            className="touch-target inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 text-xs font-bold text-rose-400 transition hover:border-rose-500/50 hover:bg-rose-500/20 sm:min-h-11 sm:min-w-0 sm:rounded-2xl sm:px-4 sm:text-sm"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </button>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
          <NotificationBell />
          {role === "teacher" && tenantSlug ? (
            <TeacherShareButton tenantName={tenantName} tenantSlug={tenantSlug} hasSubscription={hasSubscription} />
          ) : null}
          <div className="hidden min-w-0 text-end md:block">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">المعلم</p>
            <h1 className="truncate text-base font-extrabold text-primary dark:text-sky-300">{tenantName}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}
