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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type Role = "teacher" | "student" | "parent";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navigation: Record<Role, NavigationItem[]> = {
  teacher: [
    { href: "/teacher", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/teacher/groups", label: "المجموعات", icon: Users },
    { href: "/teacher/students", label: "الطلاب", icon: GraduationCap },
    { href: "/attendance", label: "الحضور", icon: CheckSquare },
    { href: "/payments", label: "المصاريف", icon: Wallet },
    { href: "/teacher/schedule", label: "الجدول", icon: Calendar },
    { href: "/teacher/settings", label: "الإعدادات", icon: Settings },
  ],
  student: [
    { href: "/student", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/student/schedule", label: "جدولي", icon: Calendar },
  ],
  parent: [
    { href: "/parent", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/parent", label: "أبنائي", icon: Heart },
  ],
};

function isItemActive(pathname: string, href: string) {
  if (href === "/teacher" || href === "/student" || href === "/parent") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function Sidebar({ role }: { role: Role; currentPath: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[280px] shrink-0 border-s border-slate-200/40 bg-[linear-gradient(180deg,_#1d4f73_0%,_#1f5f88_42%,_#184766_100%)] text-white xl:block dark:border-slate-800/60 dark:bg-[linear-gradient(180deg,_#0b1327_0%,_#10203b_34%,_#153756_100%)]">
      <div className="sticky top-0 flex min-h-screen flex-col overflow-hidden px-5 py-6">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.26),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.16),_transparent_58%)]" />
          <div className="absolute inset-y-0 start-0 w-px bg-white/12 dark:bg-white/5" />
        </div>

        <div className="relative rounded-[30px] border border-white/15 bg-white/10 p-6 shadow-[0_24px_60px_rgba(8,15,35,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_28px_70px_rgba(2,6,23,0.35)]">
          <p className="text-start text-sm font-semibold text-white/75">EduPlatform</p>
          <h2 className="mt-3 text-start text-[2rem] font-extrabold leading-tight">منصة التعليم الذكية</h2>
          <p className="mt-3 text-start text-sm leading-8 text-white/80">واجهة موحدة لإدارة الحضور والمجموعات والتحصيل بسهولة.</p>
        </div>

        <nav className="relative mt-8 space-y-2.5">
          {navigation[role].map((item) => {
            const isActive = isItemActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "group relative flex min-h-[52px] items-center justify-between gap-3 overflow-hidden rounded-[22px] px-4 py-3 text-sm font-semibold transition duration-300",
                  isActive
                    ? "bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(241,245,249,0.92))] text-primary shadow-[0_14px_34px_rgba(8,15,35,0.22)]"
                    : "text-white/88 hover:bg-white/10 hover:text-white dark:hover:bg-white/8",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-2 start-1 w-1 rounded-full transition-all duration-300",
                    isActive ? "bg-secondary shadow-[0_0_0_4px_rgba(46,134,193,0.16)]" : "bg-transparent group-hover:bg-white/45",
                  )}
                />
                <span
                  className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    isActive
                      ? "bg-[linear-gradient(90deg,_rgba(46,134,193,0.10),_transparent_55%)] opacity-100"
                      : "opacity-0 group-hover:opacity-100 group-hover:bg-[linear-gradient(90deg,_rgba(255,255,255,0.09),_transparent_60%)]",
                  )}
                />
                <div className="relative flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate text-start">{item.label}</span>
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition duration-300",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-white/8 text-white/92 group-hover:bg-white/14 group-hover:text-white dark:bg-white/6 dark:group-hover:bg-white/10",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 transition duration-300", isActive ? "scale-110" : "group-hover:scale-110 group-hover:-translate-y-0.5")} />
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-auto rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <p className="text-start text-sm font-bold text-white">لوحة مصممة للجوال أولاً</p>
          <p className="mt-3 text-start text-sm leading-8 text-white/78">تنقل سريع، تباين واضح، ولمسات بصرية ثابتة في كل الصفحات.</p>
        </div>
      </div>
    </aside>
  );
}
