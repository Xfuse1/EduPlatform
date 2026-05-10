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
        "h-screen w-[300px] shrink-0 border-s border-white/5 bg-[#0D1B2A] text-white",
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
            className="relative mb-4 ms-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white xl:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[rgba(255,255,255,0.03)] px-7 py-6 shadow-[0_14px_32px_rgba(3,10,25,0.18)] backdrop-blur-xl">
          <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(circle_at_top,black,transparent)] bg-[size:20px_20px] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#00B8A0] shadow-[0_0_8px_#00B8A0]" />
              <span>EduPlatform</span>
            </div>
            <h2 className="mt-6 text-start text-[2rem] font-black leading-[1.08] tracking-tight text-white">
              منصة
              <br />
              التعليم الذكية
            </h2>
            <p className="mt-4 max-w-[16rem] text-start text-sm leading-7 text-white/50">
              إدارة الحضور والمجموعات والتحصيل داخل تجربة أوضح وأهدأ.
            </p>
          </div>
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
                      ? "bg-[rgba(0,184,160,0.15)] text-white border-s-4 border-[#00B8A0] shadow-[0_0_15px_rgba(0,184,160,0.1)]"
                      : "text-white/40 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] transition duration-300",
                      isActive
                        ? "bg-[#00B8A0]/20 text-[#00B8A0]"
                        : "bg-white/[0.045] text-[#94A3B8] group-hover:bg-white/[0.06] group-hover:text-white",
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

