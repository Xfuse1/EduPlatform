export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { ParentRegisterLauncher } from "@/modules/public-pages/components/ParentRegisterLauncher";

export default async function SlugParentRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ phone?: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const { phone } = await searchParams;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 bg-transparent"
      dir="rtl"
    >
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6 z-20" dir="rtl">
        <Link
          href={`/${slug}/login`}
          className="inline-flex items-center gap-2 rounded-xl border border-[#00B8A0]/20 bg-[#00B8A0]/10 px-4 py-2.5 text-sm font-bold text-[#00B8A0] shadow-sm transition hover:bg-[#00B8A0]/20 hover:scale-105 active:scale-95"
        >
          <span>لديك حساب؟ سجل دخول</span>
        </Link>

        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#1A2B6D] shadow-md transition hover:bg-slate-50 hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white"
        >
          <ChevronRight className="h-4 w-4" />
          <span>رجوع لصفحة المعلم</span>
        </Link>
      </div>

      <div className="w-full max-w-[500px] font-[Cairo]">
        <ParentRegisterLauncher initialPhone={phone} tenantSlug={slug} tenantName={tenant.name} />
      </div>
    </main>
  );
}
