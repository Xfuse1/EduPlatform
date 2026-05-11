'use client';

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { TeacherShareButton } from "@/components/layout/TeacherShareButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useFontSize } from "@/hooks/useFontSize";

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

  const { fontSize, setFontSize } = useFontSize();

  const handleToggleFontSize = () => {
    if (fontSize === 'normal') setFontSize('large');
    else if (fontSize === 'large') setFontSize('xlarge');
    else setFontSize('normal');
  };

  const getFontSizeLabel = () => {
    if (fontSize === 'normal') return 'أ';
    if (fontSize === 'large') return 'أ+';
    return 'أ++';
  };

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
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/80 backdrop-blur-[20px] shadow-sm dark:border-white/10 dark:bg-[#0D1B2A]/85">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/90 p-1 text-sm font-extrabold text-primary shadow-lg shadow-primary/20 dark:bg-slate-900">
            {shouldRenderAvatar ? (
              <img src={avatarUrl as string} alt={userName} className="h-full w-full rounded-xl object-contain" onError={() => setAvatarFailed(true)} />
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
              className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[#00B8A0]/50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 xl:hidden"
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
          <button
            type="button"
            onClick={handleToggleFontSize}
            className={`touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border transition-all duration-300 font-bold text-lg ${
              fontSize !== 'normal'
                ? 'border-[#00B8A0]/50 bg-[#00B8A0]/10 text-[#00B8A0] shadow-[0_0_15px_rgba(0,184,160,0.15)]'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 hover:border-secondary/40 hover:text-primary'
            }`}
            title="تغيير حجم الخط"
          >
            <span className="mt-[-2px]">{getFontSizeLabel()}</span>
          </button>
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
