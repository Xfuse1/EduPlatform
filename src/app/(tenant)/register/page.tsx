export const dynamic = "force-dynamic";

import { requireTenant } from "@/lib/tenant";
import { RegistrationForm } from "@/modules/public-pages/components/RegistrationForm";
import { getOpenGroups } from "@/modules/public-pages/queries";

export default async function RegisterPage() {
  const tenant = await requireTenant();
  const groups = await getOpenGroups(tenant.id);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <RegistrationForm groups={groups} />
      </div>
    </main>
  );
}
