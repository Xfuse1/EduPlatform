export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { StudentRegistrationForm } from "@/modules/auth/components/StudentRegistrationForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const tenant = await requireTenant();
  const params = await searchParams;
  return (
    <main 
      className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-center"
    >
      <Link
        href="/"
        className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[#94A3B8] backdrop-blur transition hover:bg-white/10 sm:end-6 sm:top-6"
      >
        <ChevronRight className="h-4 w-4" />
        رجوع
      </Link>
      <div className="mx-auto w-full max-w-2xl">
        <StudentRegistrationForm tenantName={tenant.name} initialPhone={params.phone} />
      </div>
    </main>
  );
}
