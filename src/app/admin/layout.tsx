import { requireSuperAdminPage } from "@/lib/platform-admin";
import { AdminShell } from "@/modules/admin/components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdminPage();
  return <AdminShell>{children}</AdminShell>;
}
