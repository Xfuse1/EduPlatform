'use client';

import {
  Calendar,
  CheckSquare,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
  ClipboardList,
  PenTool,
  ShieldCheck,
  MessageSquare,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type DashboardRole = "teacher" | "student" | "parent";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeMode?: "exact" | "nested";
};

const navigation: Record<DashboardRole, NavigationItem[]> = {
  teacher: [
    { href: "/teacher", label: "لوحة التحكم", icon: LayoutDashboard, activeMode: "exact" },
    { href: "/teacher/groups", label: "المجموعات", icon: Users },
    { href: "/teacher/students", label: "الطلاب", icon: GraduationCap },
    { href: "/attendance", label: "الحضور", icon: CheckSquare },
    { href: "/teacher/assignments", label: "الواجبات", icon: ClipboardList },
    { href: "/teacher/exams", label: "الامتحانات", icon: PenTool },
    { href: "/payments", label: "المصاريف", icon: Wallet },
    { href: "/teacher/schedule", label: "الجدول", icon: Calendar },
    { href: "/teacher/assistants", label: "المساعدين", icon: ShieldCheck },
    { href: "/messages", label: "الرسائل", icon: MessageSquare },
    { href: "/teacher/settings", label: "الإعدادات", icon: Settings },
  ],
  student: [
    { href: "/student", label: "لوحة التحكم", icon: LayoutDashboard, activeMode: "exact" },
    { href: "/student/schedule", label: "جدولي", icon: Calendar },
    { href: "/student/assignments", label: "الواجبات", icon: ClipboardList },
    { href: "/student/exams", label: "الامتحانات", icon: PenTool },
  ],
  parent: [
    { href: "/parent", label: "لوحة التحكم", icon: LayoutDashboard, activeMode: "exact" },
    { href: "/parent/children", label: "أبنائي", icon: Heart },
    { href: "/parent/assignments", label: "الواجبات", icon: ClipboardList },
    { href: "/parent/exams", label: "الامتحانات", icon: PenTool },
    { href: "/messages", label: "الرسائل", icon: MessageSquare },
    { href: "/parent/settings", label: "الإعدادات", icon: Settings },
  ],
};

export function getNavigationItems(role: DashboardRole, _canManageTeachers?: boolean): NavigationItem[] {
  return navigation[role];
}

function isItemActive(pathname: string, item: NavigationItem) {
  if (item.activeMode === "exact" || item.href === "/teacher" || item.href === "/student" || item.href === "/parent") {
    return pathname === item.href;
  }
  return pathname.startsWith(item.href);
}

export function Sidebar({
  role,
  isOpen = false,
  onClose,
}: {
  role: DashboardRole;
  currentPath: string;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Base styles shared between desktop and mobile
        "w-[300px] shrink-0 border-s border-slate-200/40 bg-[linear-gradient(180deg,#142138_0%,#12203a_42%,#10203a_100%)] text-white dark:border-white/8 dark:bg-[linear-gradient(180deg,#0b1327_0%,#0e1b32_38%,#10243f_100%)]",
        // Desktop: always visible, part of the flow
        "hidden xl:block",
        // Mobile: overlay drawer, visible only when isOpen
        isOpen && "fixed inset-y-0 start-0 z-50 flex xl:relative xl:flex",
      )}
    >
      <div className="sticky top-0 flex min-h-screen flex-col overflow-y-auto overflow-x-hidden px-7 py-7">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_58%)]" />
          <div className="absolute inset-y-0 start-0 w-px bg-white/10 dark:bg-white/5" />
          <div className="absolute inset-y-0 end-0 w-px bg-black/10 dark:bg-black/20" />
        </div>

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={onClose}
            className="relative mb-4 ms-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white xl:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="relative rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)] px-7 py-6 shadow-[0_14px_32px_rgba(3,10,25,0.18)] backdrop-blur-xl dark:border-white/6 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.015)_100%)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/72">
            <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_0_4px_rgba(125,211,252,0.12)]" />
            <span>EduPlatform</span>
          </div>
          <h2 className="mt-6 text-start text-[2rem] font-extrabold leading-[1.08] tracking-tight text-white">
            منصة
            <br />
            التعليم الذكية
          </h2>
          <p className="mt-4 max-w-[16rem] text-start text-sm leading-7 text-white/62">
            إدارة الحضور والمجموعات والتحصيل داخل تجربة أوضح وأهدأ.
          </p>
        </div>

        <div className="relative mt-10">
          <div className="mb-4 px-2">
            <p className="text-xs font-bold tracking-wide text-white/38">التنقل الرئيسي</p>
          </div>

          <nav className="space-y-3.5">
            {navigation[role].map((item) => {
              const isActive = isItemActive(pathname, item);
              const Icon = item.icon;

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group relative flex min-h-[58px] items-center gap-4 overflow-hidden rounded-[22px] px-5 py-3 transition duration-300",
                    isActive
                      ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(241,245,249,0.92)_100%)] text-primary shadow-[0_8px_20px_rgba(2,8,20,0.15)]"
                      : "text-white/84 hover:bg-white/[0.045] hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] transition duration-300",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-white/[0.045] text-white/88 group-hover:bg-white/[0.06]",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 transition duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                  </span>

                  <div className="relative flex min-w-0 flex-1 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-start text-[1.02rem] font-bold">{item.label}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
