import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

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
  userName,
}: {
  tenantName: string;
  userName: string;
}) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/30 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-slate-950/20">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-extrabold text-white shadow-lg shadow-primary/20">
            {getInitials(userName)}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        <div className="text-end">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">اسم السنتر</p>
          <h1 className="text-base font-extrabold text-primary dark:text-sky-300">{tenantName}</h1>
        </div>
      </div>
    </header>
  );
}
