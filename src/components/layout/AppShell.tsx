import Link from "next/link";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  role,
  currentPath,
  tenantName,
  userName,
}: {
  children: React.ReactNode;
  role: "teacher" | "student" | "parent";
  currentPath: string;
  tenantName: string;
  userName: string;
}) {
  const mobileNavigation = {
    teacher: [
      { href: "/teacher", label: "الرئيسية" },
      { href: "/teacher/groups", label: "المجموعات" },
      { href: "/teacher/students", label: "الطلاب" },
      { href: "/attendance", label: "الحضور" },
      { href: "/payments", label: "المصاريف" },
      { href: "/messages", label: "الرسائل" },
    ],
    student: [
      { href: "/student", label: "الرئيسية" },
      { href: "/student/schedule", label: "جدولي" },
      { href: "/messages", label: "الرسائل" },
    ],
    parent: [
      { href: "/parent", label: "أبنائي" },
      { href: "/messages", label: "الرسائل" },
    ],
  } as const;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef4f8_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_22%),radial-gradient(circle_at_85%_18%,_rgba(15,118,110,0.12),_transparent_18%),linear-gradient(180deg,_#081120_0%,_#0b1628_42%,_#111827_100%)]">
      <div className="flex min-h-screen">
        <Sidebar currentPath={currentPath} role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header tenantName={tenantName} userName={userName} />
          <div className="border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur xl:hidden dark:border-slate-800/80 dark:bg-slate-950/60">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {mobileNavigation[role].map((item) => {
                const isActive = currentPath === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "touch-target inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <main className="page-enter mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
