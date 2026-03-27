'use client';

import {
  BellRing,
  Calendar,
  CheckSquare,
  GraduationCap,
  Heart,
  LayoutDashboard,
  LineChart,
  MessageSquareText,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_CONFIG } from "@/config/app";
import { cn } from "@/lib/utils";

type Role = "center" | "teacher" | "student" | "parent";
export type DashboardRole = Role;

type NavigationItem = {
  href: string;
  label: string;
  activeMode?: "exact" | "nested";
  icon: React.ComponentType<{ className?: string }>;
};

function getNavigation(canManageTeachers: boolean): Record<Role, NavigationItem[]> {
  return {
    center: [
      { href: "/center", label: "لوحة السنتر", activeMode: "exact", icon: LayoutDashboard },
      { href: "/center/teachers", label: "إدارة المدرسين", icon: Users },
      { href: "/center/schedule", label: "الجدول والقاعات", icon: Calendar },
      { href: "/center/attendance", label: "الحضور اللحظي", icon: CheckSquare },
      { href: "/center/payments", label: "التحصيل", icon: Wallet },
      { href: "/center/reports", label: "التقارير", icon: LineChart },
      { href: "/center/announcements", label: "الإعلانات", icon: MessageSquareText },
      { href: "/center/settings", label: "الإعدادات", icon: Settings },
    ],
    teacher: [
      { href: "/teacher", label: "لوحة المدرس", activeMode: "exact", icon: LayoutDashboard },
      ...(canManageTeachers ? [{ href: "/teacher/teachers", label: "فريق السنتر", icon: Users }] : []),
      { href: "/teacher/groups", label: "المجموعات", icon: Users },
      { href: "/teacher/students", label: "الطلاب", icon: GraduationCap },
      { href: "/attendance", label: "الحضور", icon: CheckSquare },
      { href: "/payments", label: "التحصيل", icon: Wallet },
      { href: "/teacher/schedule", label: "الجدول", icon: Calendar },
      { href: "/teacher/settings", label: "الإعدادات", icon: Settings },
    ],
    student: [
      { href: "/student", label: "لوحة الطالب", activeMode: "exact", icon: LayoutDashboard },
      { href: "/student/schedule", label: "جدولي", icon: Calendar },
    ],
    parent: [
      { href: "/parent", label: "لوحة ولي الأمر", activeMode: "exact", icon: LayoutDashboard },
      { href: "/parent/children", label: "الأبناء", activeMode: "nested", icon: Heart },
    ],
  };
}

export function getNavigationItems(role: DashboardRole, canManageTeachers = false) {
  return getNavigation(canManageTeachers)[role];
}

function isItemActive(pathname: string, item: NavigationItem) {
  if (item.activeMode === "exact") {
    return pathname === item.href;
  }

  if (item.activeMode === "nested") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidebar({
  role,
  canManageTeachers = false,
}: {
  role: Role;
  currentPath: string;
  canManageTeachers?: boolean;
}) {
  const pathname = usePathname();
  const navigation = getNavigationItems(role, canManageTeachers);
  const roleLabel =
    role === "center" ? "وضع إدارة السنتر" : role === "teacher" ? "وضع المدرس" : role === "student" ? "وضع الطالب" : "وضع ولي الأمر";

  return (
    <aside className="hidden w-[340px] shrink-0 border-s border-slate-200/40 bg-[linear-gradient(180deg,#132238_0%,#12203a_42%,#0f1d35_100%)] text-white xl:block dark:border-white/8">
      <div className="sticky top-0 flex min-h-screen flex-col overflow-hidden px-7 py-7">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),transparent_62%)]" />
          <div className="absolute inset-y-0 start-0 w-px bg-white/10" />
        </div>

        <div className="relative rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)] px-7 py-6 shadow-[0_14px_32px_rgba(3,10,25,0.18)] backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/72">
            <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_0_4px_rgba(125,211,252,0.12)]" />
            <span>{APP_CONFIG.name}</span>
          </div>
          <h2 className="mt-6 text-start text-[2rem] font-extrabold leading-[1.08] tracking-tight text-white">
            مركز قيادة
            <br />
            التعليم اليومي
          </h2>
          <p className="mt-4 max-w-[16rem] text-start text-sm leading-7 text-white/62">
            {APP_CONFIG.shortDescription}
          </p>
          <div className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/70">
            <BellRing className="h-4 w-4" />
            {roleLabel}
          </div>
        </div>

        <div className="relative mt-10">
          <div className="mb-4 px-2">
            <p className="text-xs font-bold tracking-wide text-white/38">التنقل الرئيسي</p>
          </div>

          <nav className="space-y-3.5">
            {navigation.map((item) => {
              const active = isItemActive(pathname, item);
              const Icon = item.icon;

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={cn(
                    "group relative flex min-h-[58px] items-center gap-4 overflow-hidden rounded-[22px] px-5 py-3 transition duration-300",
                    active
                      ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(241,245,249,0.92)_100%)] text-primary shadow-[0_8px_20px_rgba(2,8,20,0.15)]"
                      : "text-white/84 hover:bg-white/[0.045] hover:text-white",
                  )}
                >
                  {active ? <div className="pointer-events-none absolute inset-y-3 end-3 w-1 rounded-full bg-secondary/90" /> : null}
                  <span className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] transition duration-300", active ? "bg-primary/10 text-primary" : "bg-white/[0.045] text-white/88 group-hover:bg-white/[0.06]")}>
                    <Icon className={cn("h-5 w-5 transition duration-300", active ? "scale-110" : "group-hover:scale-110")} />
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <p className="truncate text-start text-[1.02rem] font-bold">{item.label}</p>
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
