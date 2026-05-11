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
    { href: "/payments", label: "المالية", icon: Wallet },
    { href: "/teacher/schedule", label: "الجدول", icon: Calendar },
    { href: "/messages", label: "الرسائل", icon: MessageSquare },
    { href: "/teacher/settings", label: "الإعدادات", icon: Settings },
  ],
  student: [
    { href: "/student", label: "لوحة التحكم", icon: LayoutDashboard, activeMode: "exact" },
    { href: "/student/schedule", label: "جدولي", icon: Calendar },
    { href: "/student/assignments", label: "الواجبات", icon: ClipboardList },
    { href: "/student/exams", label: "الامتحانات", icon: PenTool },
    { href: "/payments", label: "المالية", icon: Wallet },
    { href: "/student/settings", label: "الإعدادات", icon: Settings },
  ],
  parent: [
    { href: "/parent", label: "لوحة التحكم", icon: LayoutDashboard, activeMode: "exact" },
    { href: "/parent/children", label: "أبنائي", icon: Heart },
    { href: "/parent/assignments", label: "الواجبات", icon: ClipboardList },
    { href: "/parent/exams", label: "الامتحانات", icon: PenTool },
    { href: "/payments", label: "المالية", icon: Wallet },
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
        "h-screen w-[300px] shrink-0 border-e border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#0F1D3A] dark:text-white",
        // Desktop: always visible, part of the flow
        "hidden xl:block",
        // Mobile: overlay drawer, visible only when isOpen
        isOpen && "fixed inset-y-0 start-0 z-50 flex xl:relative xl:flex",
      )}
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden px-7 py-7">
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
            className="relative mb-4 ms-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20 dark:hover:text-white xl:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="relative flex min-h-[14.25rem] flex-col justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 dark:border-secondary/20 dark:bg-[#081426] px-5 py-12 shadow-[0_14px_32px_rgba(3,10,25,0.05)] dark:shadow-[0_14px_32px_rgba(3,10,25,0.22)]">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-[linear-gradient(135deg,#00B8A0,#5EEAD4)] text-slate-950 shadow-[0_12px_30px_rgba(0,184,160,0.24)]">
              <span className="text-xl font-black leading-none tracking-normal">EP</span>
            </div>
            <div className="min-w-0 text-start">
              <p className="truncate text-xl font-black leading-tight text-slate-900 dark:text-secondary">EduPlatform</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-500 dark:text-slate-400">منصة التعليم الذكية</p>
            </div>
          </div>
          <p className="mt-5 text-start text-xs font-semibold leading-6 text-slate-400">
            إدارة الحضور والمجموعات والتحصيل في مساحة واحدة.
          </p>
        </div>

        <div className="relative mt-8">
          <div className="mb-4 px-2">
            <p className="text-xs font-bold tracking-wide text-slate-400 dark:text-white/40">التنقل الرئيسي</p>
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
                    "group relative flex min-h-[58px] items-center gap-4 overflow-hidden px-5 py-3 transition duration-300",
                    isActive
                      ? "bg-[#00B8A0]/10 text-[#00B8A0] border-s-[3px] border-[#00B8A0] rounded-[8px]"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#ffffff] dark:hover:bg-white/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] transition duration-300",
                      isActive
                        ? "bg-[#00B8A0]/20 text-[#00B8A0]"
                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-900 dark:bg-white/[0.045] dark:text-[#94A3B8] dark:group-hover:bg-white/[0.06] dark:group-hover:text-white",
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

