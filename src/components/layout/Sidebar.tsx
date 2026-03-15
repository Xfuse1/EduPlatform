import Link from "next/link";

import { cn } from "@/lib/utils";

const navigation = {
  teacher: [
    { href: "/teacher", label: "لوحة التحكم" },
    { href: "/teacher/groups", label: "المجموعات" },
    { href: "/teacher/students", label: "الطلاب" },
    { href: "/attendance", label: "الحضور" },
    { href: "/payments", label: "المصاريف" },
    { href: "/teacher/schedule", label: "الجدول" },
    { href: "/teacher/settings", label: "الإعدادات" },
  ],
  student: [
    { href: "/student", label: "لوحة التحكم" },
    { href: "/student/schedule", label: "جدولي" },
  ],
  parent: [
    { href: "/parent", label: "لوحة التحكم" },
    { href: "/parent", label: "أبنائي" },
  ],
} as const;

export function Sidebar({ role, currentPath }: { role: "teacher" | "student" | "parent"; currentPath: string }) {
  return (
    <aside className="hidden w-72 shrink-0 border-e bg-white lg:block">
      <div className="sticky top-0 p-5">
        <div className="rounded-3xl bg-primary px-5 py-6 text-white">
          <p className="text-sm text-white/80">EduPlatform</p>
          <p className="mt-2 text-xl font-extrabold">لوحة السنتر</p>
        </div>
        <nav className="mt-6 space-y-2">
          {navigation[role].map((item) => {
            const isActive = currentPath === item.href;

            return (
              <Link
                key={item.href}
                className={cn(
                  "touch-target flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  isActive ? "bg-primary text-white" : "text-slate-700 hover:bg-slate-100",
                )}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
