export const dynamic = "force-dynamic";

import { requireTenant } from "@/lib/tenant";
import { OTPInput } from "@/modules/auth/components/OTPInput";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const tenant = await requireTenant();
  const params = await searchParams;
  const phone = params.phone ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#0f172a_0%,_#13253a_45%,_#e2e8f0_120%)] px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <OTPInput phone={phone} tenantName={tenant.name} />
      </div>
    </main>
  );
}
