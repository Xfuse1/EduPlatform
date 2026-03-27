import Link from "next/link";

import { LogoutButton } from "@/components/layout/LogoutButton";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

type HeaderPortalLink = {
  href: string;
  label: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
}

export function Header({
  tenantName,
  tenantLabel = "اسم السنتر",
  userName,
  portalLinks = [],
}: {
  tenantName: string;
  tenantLabel?: string;
  userName: string;
  portalLinks?: HeaderPortalLink[];
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/30 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-slate-950/20">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <LogoutButton />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-extrabold text-white shadow-lg shadow-primary/20">
            {getInitials(userName)}
          </div>
        </div>

        {portalLinks.length > 0 ? (
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
            {portalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "touch-target inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition",
                  "hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-sky-400/30 dark:hover:text-sky-300",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="text-end">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{tenantLabel}</p>
          <h1 className="text-base font-extrabold text-primary dark:text-sky-300">{tenantName}</h1>
        </div>
      </div>

      {portalLinks.length > 0 ? (
        <div className="border-t border-slate-200/80 px-4 py-3 md:hidden dark:border-slate-800/80">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {portalLinks.map((link) => (
              <Link
                key={`${link.href}-mobile`}
                href={link.href}
                className={cn(
                  "touch-target inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition",
                  "hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-sky-400/30 dark:hover:text-sky-300",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
