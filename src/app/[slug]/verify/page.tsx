export const dynamic = "force-dynamic";

import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { OTPInput } from "@/modules/auth/components/OTPInput";

export default async function SlugVerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ phone?: string; tenantId?: string; next?: string; mode?: string; studentName?: string; gradeLevel?: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const queryParams = await searchParams;
  const phone = queryParams.phone ?? "";
  const actualTenantId = queryParams.tenantId ?? tenant.id;
  const nextPath = queryParams.next;
  const mode = queryParams.mode;
  const studentName = queryParams.studentName;
  const gradeLevel = queryParams.gradeLevel;

  return (
    <main 
      className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 bg-transparent"
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
