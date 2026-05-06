export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getPlatformConfigValue } from "@/modules/admin/actions";
import { PaymentsPageClient } from "@/modules/payments/components/PaymentsPageClient";
import { SubscriptionPlans } from "@/modules/payments/components/SubscriptionPlans";
import { TeacherWalletPageClient } from "@/modules/payments/components/TeacherWalletPageClient";
import { WalletPageClient } from "@/modules/payments/components/WalletPageClient";
import { getSubscriptionPlanConfigs } from "@/modules/payments/providers/plan-config";
import { getTeacherSubscription } from "@/modules/payments/providers/subscription";
import { getPaymentsList, getTeacherWalletPageData } from "@/modules/payments/queries";
import type { PlanConfig } from "@/modules/payments/providers/plan-config";

type PaymentsPageProps = {
  searchParams: Promise<{
    student?: string;
    status?: string;
    required?: string;
  }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const tenant = await requireTenant();
  const user = await requireAuth();

  const params = await searchParams;
  const initialStudentQuery = params.student ?? "";
  const initialStatus = params.status === "PAID" || params.status === "OVERDUE" || params.status === "PENDING" ? params.status : "ALL";
  const subscriptionRequired = params.required === "1";
  const [payments, subscription, plans, adminContact] = await Promise.all([
    getPaymentsList(tenant.id),
    ["TEACHER", "ASSISTANT"].includes(user.role) ? getTeacherSubscription() : Promise.resolve(null),
    ["TEACHER", "ASSISTANT"].includes(user.role) ? getSubscriptionPlanConfigs() : Promise.resolve({} as Record<string, PlanConfig>),
    getPlatformConfigValue("admin_contact"),
  ]);

  const activePlans = Object.values(plans).filter((plan) => plan.isActive && !plan.deletedAt);
  const clientPayments: Array<{
    id: string;
    studentId: string;
    studentName: string;
    month: string;
    status: "PAID" | "OVERDUE" | "PENDING";
    amount: number;
  }> = payments.map((payment) => ({
    ...payment,
    status: payment.status === "PAID" || payment.status === "OVERDUE" ? payment.status : "PENDING",
  }));
  const teacherWalletData = user.role === "TEACHER" || user.role === "CENTER_ADMIN"
    ? await getTeacherWalletPageData(user.tenantId)
    : null;

  const parentChildren = user.role === "PARENT"
    ? await db.parentStudent.findMany({
        where: { parentId: user.id },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { student: { name: "asc" } },
      })
    : [];

  const needsSubscription = subscriptionRequired && ["TEACHER", "CENTER_ADMIN", "ASSISTANT"].includes(user.role) && (!subscription || !subscription.isActive);

  return (
    <div className="space-y-8">
      {needsSubscription && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-5 text-right">
          <p className="text-lg font-bold text-amber-400">الاشتراك مطلوب للوصول للمنصة</p>
          <p className="mt-1 text-sm text-amber-300/80">
            اختر الباقة المناسبة من قسم <strong>الاشتراك</strong> أدناه لتفعيل حسابك والوصول لجميع ميزات المنصة.
          </p>
          <a
            href="#subscription"
            className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
          >
            اشترك الآن ←
          </a>
        </div>
      )}

      <section id="expenses">
        <PaymentsPageClient
          initialPayments={clientPayments}
          initialStatus={initialStatus}
          initialStudentQuery={initialStudentQuery}
        />
      </section>

      <section id="wallet" className="scroll-mt-24">
        {teacherWalletData ? (
          <TeacherWalletPageClient data={teacherWalletData} />
        ) : user.role === "PARENT" ? (
          <WalletPageClient
            role="PARENT"
            userId={user.id}
            children={parentChildren.map((link) => ({ id: link.student.id, name: link.student.name }))}
          />
        ) : user.role === "STUDENT" ? (
          <WalletPageClient role="STUDENT" userId={user.id} />
        ) : null}
      </section>

      {["TEACHER", "ASSISTANT"].includes(user.role) ? (
        <section id="subscription" className="scroll-mt-24">
          <SubscriptionPlans
            currentPlan={subscription?.planKey ?? subscription?.subscriptionPlan ?? null}
            currentCycle={subscription?.billingCycle ?? null}
            nextBillingAt={subscription?.nextBillingAt?.toISOString() ?? null}
            isActive={subscription?.isActive ?? false}
            kashierStatus={null}
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
        </section>
      ) : null}
    </div>
  );
}
