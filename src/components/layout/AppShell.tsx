'use client';

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  role,
  tenantName,
  userName,
}: {
  children: React.ReactNode;
  role: "teacher" | "student" | "parent";
  currentPath: string;
  tenantName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      { href: "/parent", label: "لوحة التحكم" },
      { href: "/parent/children", label: "أبنائي" },
      { href: "/parent/assignments", label: "الواجبات" },
      { href: "/parent/exams", label: "الامتحانات" },
    ],
  } as const;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef4f8_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_22%),radial-gradient(circle_at_85%_18%,_rgba(15,118,110,0.12),_transparent_18%),linear-gradient(180deg,_#081120_0%,_#0b1628_42%,_#111827_100%)]">
      <div className="flex min-h-screen">
        {/* Mobile sidebar overlay backdrop */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm xl:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          role={role}
          currentPath={pathname}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            tenantName={tenantName}
            userName={userName}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          />
          <main className="page-enter mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
