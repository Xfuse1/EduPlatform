import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({
  children,
  role,
  currentPath,
  tenantName,
}: {
  children: React.ReactNode;
  role: "teacher" | "student" | "parent";
  currentPath: string;
  tenantName: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar currentPath={currentPath} role={role} />
        <div className="flex-1">
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div>
                <p className="text-sm text-slate-500">السنتر الحالي</p>
                <h1 className="text-lg font-bold text-slate-900">{tenantName}</h1>
              </div>
              <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">مساحة آمنة</div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
