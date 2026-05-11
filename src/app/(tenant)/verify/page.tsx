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
    <main 
      className="dark flex min-h-screen items-center justify-center bg-[#0D1B2A] px-4 py-8 text-white [color-scheme:dark] sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse at 15% 50%, rgba(0,184,160,0.12) 0%, transparent 50%), radial-gradient(ellipse at 85% 20%, rgba(26,43,109,0.4) 0%, transparent 50%), #0D1B2A",
        colorScheme: "dark",
      }}
    >
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
