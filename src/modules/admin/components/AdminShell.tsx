"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, LayoutDashboard, Package, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "المؤسسات", icon: Building2 },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/finance", label: "المالية", icon: CreditCard },
  { href: "/admin/plans", label: "الباقات", icon: Package },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.22),_transparent_28%),linear-gradient(180deg,_#040b1d_0%,_#07132a_42%,_#0b1d3a_100%)]"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 rounded-2xl border border-sky-300/20 bg-slate-900/50 p-2 backdrop-blur">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition",
                      isActive
                        ? "border-sky-300/30 bg-sky-300/15 text-white"
                        : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-sky-300/30 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {children}
      </div>
    </div>
  );
}
