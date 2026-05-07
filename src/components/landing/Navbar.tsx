"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  links: readonly NavLink[];
}

export default function Navbar({ links }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/20">
            E
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            EduPlatform
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              className="text-sm font-bold text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              className="px-4 py-2 text-sm font-bold text-slate-700 transition hover:text-primary dark:text-slate-300 dark:hover:text-white"
              href="/login"
            >
              تسجيل الدخول
            </Link>
            <Link
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-secondary hover:scale-[1.03] active:scale-[0.97]"
              href="/signup"
            >
              ابدأ مجاناً
            </Link>
          </div>

          {/* Mobile Login Button Only */}
          <Link
            className="sm:hidden rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20"
            href="/login"
          >
            دخول
          </Link>
        </div>
      </div>
    </header>
  );
}
