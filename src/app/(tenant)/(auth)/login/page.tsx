export const dynamic = "force-dynamic";

import { requireTenant } from "@/lib/tenant";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export default async function LoginPage() {
  const tenant = await requireTenant();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.22),_transparent_30%),linear-gradient(145deg,_#0f2740_0%,_#1A5276_45%,_#dbeafe_120%)] px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <LoginForm tenant={tenant} />
      </div>
    </main>
  );
}
