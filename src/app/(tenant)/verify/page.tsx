export const dynamic = "force-dynamic";

import { requireTenant } from "@/lib/tenant";
import { OTPInput } from "@/modules/auth/components/OTPInput";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; tenantId?: string; next?: string; mode?: string; studentName?: string; gradeLevel?: string }>;
}) {
  const tenant = await requireTenant();
  const params = await searchParams;
  const phone = params.phone ?? "";
  const actualTenantId = params.tenantId ?? tenant.id;
  const nextPath = params.next;
  const mode = params.mode;
  const studentName = params.studentName;
  const gradeLevel = params.gradeLevel;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#0f172a_0%,_#13253a_45%,_#e2e8f0_120%)] px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <OTPInput
          phone={phone}
          tenantName={tenant.name}
          actualTenantId={actualTenantId}
          nextPath={nextPath}
          mode={mode}
          studentName={studentName}
          gradeLevel={gradeLevel}
        />
      </div>
    </main>
  );
}
