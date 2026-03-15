export const dynamic = "force-dynamic";

import { requireTenant } from "@/lib/tenant";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export default async function LoginPage() {
  const tenant = await requireTenant();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <LoginForm tenant={tenant} />
      </div>
    </main>
  );
}
