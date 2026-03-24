export const dynamic = "force-dynamic";

import { getOptionalTenant } from "@/lib/tenant";
import { LoginForm } from "@/modules/auth/components/LoginForm";

const portalNoticeMap: Record<string, string> = {
  teacher: "هذا المسار مخصص لدخول داش المدرس المنضم للسنتر.",
  parent: "هذا المسار مخصص لدخول داش ولي الأمر.",
  student: "هذا المسار مخصص لدخول داش الطالب.",
};

function getLoginIntro(
  tenant:
    | {
        accountType: "CENTER" | "TEACHER" | "PARENT";
      }
    | null,
) {
  if (!tenant) {
    return "سجّل دخولك برقم هاتفك. لو كان الرقم مرتبطًا بحساب واحد فقط سنوجهك إليه تلقائيًا.";
  }

  if (tenant.accountType === "PARENT") {
    return "سجّل دخولك برقم هاتفك داخل حساب ولي الأمر المستقل.";
  }

  if (tenant.accountType === "CENTER") {
    return "سجّل دخولك برقم هاتفك داخل هذا السنتر.";
  }

  return "سجّل دخولك برقم هاتفك داخل هذا الحساب.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const params = await searchParams;
  const tenant = await getOptionalTenant();
  const portalNotice = params.portal ? portalNoticeMap[params.portal.trim().toLowerCase()] : undefined;
  const tenantSummary = tenant ?? {
    slug: null,
    name: "EduPlatform",
    logoUrl: null,
    themeColor: "#1A5276",
    accountType: null,
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.22),_transparent_30%),linear-gradient(145deg,_#0f2740_0%,_#1A5276_45%,_#dbeafe_120%)] px-4 py-8 sm:px-6"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-4 font-[Cairo]">
        <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur sm:px-5">
          <p className="text-sm font-bold leading-7 text-white">{getLoginIntro(tenant ? { accountType: tenant.accountType } : null)}</p>
          {portalNotice ? <p className="mt-2 text-xs font-medium leading-6 text-white/80">{portalNotice}</p> : null}
        </div>
        <div className="login-form-shell">
          <LoginForm tenant={tenantSummary} />
        </div>
      </div>
    </main>
  );
}
