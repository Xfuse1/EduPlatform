export const dynamic = "force-dynamic";

import { requireTenant } from "@/lib/tenant";
import { RegistrationForm } from "@/modules/public-pages/components/RegistrationForm";
import { getOpenGroups } from "@/modules/public-pages/queries";

export default async function RegisterPage() {
  const tenant = await requireTenant();
  const groups = await getOpenGroups(tenant.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.16),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef4f8_100%)] px-4 py-6 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.12),_transparent_20%),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)]">
      <div className="mx-auto max-w-4xl">
        <RegistrationForm groups={groups} />
      </div>
    </main>
  );
}
