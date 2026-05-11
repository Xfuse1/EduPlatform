export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export default async function SlugLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const queryParams = await searchParams;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 bg-transparent"
      dir="rtl"
    >
      <Link
        href={`/${slug}`}
        className="absolute end-4 top-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-[#1A2B6D] shadow-md transition hover:bg-slate-50 hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white sm:end-6 sm:top-6 z-10"
      >
        <ChevronRight className="h-4 w-4" />
        <span>رجوع لصفحة المعلم</span>
      </Link>

      <div className="w-full max-w-md space-y-4 font-[Cairo]">
        <div className="rounded-[20px] border border-slate-200 bg-white/40 dark:border-white/10 dark:bg-white/10 px-4 py-3 text-center backdrop-blur sm:px-5 shadow-sm">
          <p className="text-sm font-bold leading-7 text-slate-800 dark:text-white">
            سجّل دخولك برقم هاتفك — سنعرف حسابك تلقائياً
          </p>
        </div>
        <div className="login-form-shell">
          <LoginForm 
            tenant={tenant} 
            nextPath={queryParams.next || "/"} 
            isMainDomain={false} 
          />
        </div>
      </div>
    </main>
  );
}
