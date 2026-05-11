'use client';

import { useState } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({
  children,
  role,
  tenantSlug,
  tenantName,
  userName,
  avatarUrl,
  hasSubscription,
}: {
  children: React.ReactNode;
  role: "teacher" | "student" | "parent";
  currentPath: string;
  tenantSlug?: string;
  tenantName: string;
  userName: string;
  avatarUrl?: string | null;
  hasSubscription?: boolean;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mobileNavigation = {
    teacher: [
      { href: "/teacher", label: "الرئيسية" },
      { href: "/teacher/groups", label: "المجموعات" },
      { href: "/teacher/students", label: "الطلاب" },
      { href: "/attendance", label: "الحضور" },
      { href: "/payments", label: "المالية" },
      { href: "/messages", label: "الرسائل" },
    ],
    student: [
      { href: "/student", label: "الرئيسية" },
      { href: "/student/schedule", label: "جدولي" },
      { href: "/payments", label: "المالية" },
      { href: "/messages", label: "الرسائل" },
    ],
    parent: [
      { href: "/parent", label: "لوحة التحكم" },
      { href: "/parent/children", label: "أبنائي" },
      { href: "/parent/assignments", label: "الواجبات" },
      { href: "/parent/exams", label: "الامتحانات" },
      { href: "/payments", label: "المالية" },
    ],
  } as const;

  return (
    <div className="h-screen overflow-hidden bg-transparent">
      <div className="flex h-screen overflow-hidden">
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

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            tenantName={tenantName}
            tenantSlug={tenantSlug}
            userName={userName}
            avatarUrl={avatarUrl}
            role={role}
            hasSubscription={hasSubscription}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          />
          <main className="page-enter min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

