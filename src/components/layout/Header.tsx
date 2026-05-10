'use client';

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { TeacherShareButton } from "@/components/layout/TeacherShareButton";
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

  const shouldRenderAvatar = useMemo(() => {
    if (!avatarUrl || avatarFailed) {
      return false;
    }

    if (typeof window !== "undefined" && !window.location.hostname.includes("localhost") && avatarUrl.includes("/uploads/avatars/")) {
      return false;
    }

    return true;
  }, [avatarFailed, avatarUrl]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(13,27,42,0.8)] backdrop-blur-[16px] shadow-sm shadow-black/20">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-extrabold text-white shadow-lg shadow-primary/20 overflow-hidden">
            {shouldRenderAvatar ? (
              <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
            ) : (
              getInitials(userName)
            )}
          </div>

          {onMenuToggle && (
            <button
              type="button"
              aria-label="فتح القائمة الجانبية"
              onClick={onMenuToggle}
              className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-[#00B8A0]/50 hover:bg-white/10 xl:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            aria-label="تسجيل خروج"
            onClick={handleLogout}
            className="touch-target inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-bold text-rose-400 transition hover:bg-rose-500/20 hover:border-rose-500/50"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          {role === "teacher" && tenantSlug ? (
            <TeacherShareButton tenantName={tenantName} tenantSlug={tenantSlug} hasSubscription={hasSubscription} />
          ) : null}
          <div className="text-end">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">المعلم</p>
            <h1 className="text-base font-extrabold text-primary dark:text-sky-300">{tenantName}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}
