export const dynamic = "force-dynamic";

import { requireTenant } from "@/lib/tenant";
import { RegistrationForm } from "@/modules/public-pages/components/RegistrationForm";
import { getOpenGroups } from "@/modules/public-pages/queries";

export default async function RegisterPage() {
  const tenant = await requireTenant();
  const groups = await getOpenGroups(tenant.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(46,134,193,0.18)_0%,transparent_26%),radial-gradient(circle_at_bottom_left,rgba(26,82,118,0.12)_0%,transparent_24%),linear-gradient(180deg,#0d1830_0%,#13203a_38%,#0f1a30_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <RegistrationForm groups={groups} />
      </div>
    </main>
  );
}
