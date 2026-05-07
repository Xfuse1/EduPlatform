export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import { getPlatformConfigValue } from "@/modules/admin/actions";
import { SubscriptionPlans } from "@/modules/payments/components/SubscriptionPlans";
import { getSubscriptionPlanConfigs } from "@/modules/payments/providers/plan-config";
import { getTeacherSubscription } from "@/modules/payments/providers/subscription";

type PaymentsSubscriptionPageProps = {
  searchParams: Promise<{
    kashier?: string;
  }>;
};

function canViewSubscriptionPage(role: string) {
  return role === "TEACHER" || role === "CENTER_ADMIN" || role === "ASSISTANT";
}

function normalizeKashierStatus(status?: string) {
  return status === "success" || status === "failed" || status === "pending" ? status : null;
}

export default async function PaymentsSubscriptionPage({ searchParams }: PaymentsSubscriptionPageProps) {
  const user = await requireAuth();

  if (!canViewSubscriptionPage(user.role)) {
    redirect("/payments");
  }

  const params = await searchParams;
  const [subscription, plans, adminContact] = await Promise.all([
    getTeacherSubscription(),
    getSubscriptionPlanConfigs(),
    getPlatformConfigValue("admin_contact"),
  ]);

  const activePlans = Object.values(plans).filter((plan) => plan.isActive && !plan.deletedAt);

  return (
    <div className="space-y-4">
      <div className="flex justify-start">
        <Link
          href="/payments"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          الرجوع للمالية
        </Link>
      </div>

      <SubscriptionPlans
        currentPlan={subscription?.planKey ?? subscription?.subscriptionPlan ?? null}
        currentCycle={subscription?.billingCycle ?? null}
        nextBillingAt={subscription?.nextBillingAt?.toISOString() ?? null}
        isActive={subscription?.isActive ?? false}
        kashierStatus={normalizeKashierStatus(params.kashier)}
        adminContact={adminContact}
        plans={activePlans.map((plan) => ({
          key: plan.key,
          title: plan.name,
          monthly: plan.monthlyPrice,
          yearly: plan.yearlyPrice,
          features: [
            `حتى ${plan.limits.students === Number.MAX_SAFE_INTEGER ? "غير محدود" : plan.limits.students} طالب`,
            `حتى ${plan.limits.groups === Number.MAX_SAFE_INTEGER ? "غير محدود" : plan.limits.groups} مجموعة`,
          ],
          isActive: plan.isActive,
        }))}
      />
    </div>
  );
}
