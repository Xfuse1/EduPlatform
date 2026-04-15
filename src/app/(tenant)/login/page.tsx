export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const tenant = await requireTenant();
  const params = await searchParams;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.22),_transparent_30%),linear-gradient(145deg,_#0f2740_0%,_#1A5276_45%,_#dbeafe_120%)] px-4 py-8 sm:px-6"
      dir="rtl"
    >
      <Link
        href="/"
        className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:end-6 sm:top-6"
      >
        <ChevronRight className="h-4 w-4" />
        رجوع
      </Link>

      <div className="w-full max-w-md space-y-4 font-[Cairo]">
        <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur sm:px-5">
          <p className="text-sm font-bold leading-7 text-white">سجّل دخولك برقم هاتفك — سنعرف حسابك تلقائياً</p>
        </div>
        <div className="login-form-shell">
          <LoginForm tenant={tenant} nextPath={params.next} />
        </div>
      </div>
    </main>
  );
}
