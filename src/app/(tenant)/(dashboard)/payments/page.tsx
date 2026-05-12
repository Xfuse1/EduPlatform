export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getPlatformConfigValue } from "@/modules/admin/actions";
import { PaymentsPageClient } from "@/modules/payments/components/PaymentsPageClient";
import { TeacherWalletPageClient } from "@/modules/payments/components/TeacherWalletPageClient";
import { WalletPageClient } from "@/modules/payments/components/WalletPageClient";
import { getTeacherSubscription } from "@/modules/payments/providers/subscription";
import { getPaymentsList, getTeacherWalletPageData } from "@/modules/payments/queries";

type PaymentsPageProps = {
  searchParams: Promise<{
    student?: string;
    status?: string;
    required?: string;
  }>;
};

function isTeacherFinanceRole(role: string) {
  return role === "TEACHER" || role === "CENTER_ADMIN";
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const tenant = await requireTenant();
  const user = await requireAuth();

  const params = await searchParams;
  const initialStudentQuery = params.student ?? "";
  const initialStatus = params.status === "PAID" || params.status === "OVERDUE" || params.status === "PENDING" ? params.status : "ALL";
  const subscriptionRequired = params.required === "1";

  if (isTeacherFinanceRole(user.role)) {
    const [teacherWalletData, subscription] = await Promise.all([
      getTeacherWalletPageData(user.tenantId),
      getTeacherSubscription(),
    ]);
    const needsSubscription = subscriptionRequired && (!subscription || !subscription.isActive);

    return (
      <div className="space-y-6 sm:space-y-8">
        {needsSubscription ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-right sm:px-6 sm:py-5">
            <p className="text-lg font-bold text-amber-400">الاشتراك مطلوب للوصول للمنصة</p>
            <p className="mt-1 text-sm text-amber-300/80">
              اختر الباقة المناسبة من صفحة <strong>الاشتراك</strong> لتفعيل حسابك والوصول لجميع ميزات المنصة.
            </p>
            <a
              href="/payments/subscription"
              className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
            >
              اشترك الآن ←
            </a>
          </div>
        ) : null}

        <section id="wallet" className="scroll-mt-24">
          <TeacherWalletPageClient data={teacherWalletData} />
        </section>
      </div>
    );
  }

  if (user.role === "PARENT") {
    const [parentChildren, adminContact] = await Promise.all([
      db.parentStudent.findMany({
        where: { parentId: user.id },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { student: { name: "asc" } },
      }),
      getPlatformConfigValue("admin_contact"),
    ]);

    return (
      <div className="space-y-6 sm:space-y-8">
        <section id="wallet" className="scroll-mt-24">
          <WalletPageClient
            role="PARENT"
            userId={user.id}
            children={parentChildren.map((link) => ({ id: link.student.id, name: link.student.name }))}
            adminContact={adminContact}
          />
        </section>
      </div>
    );
  }

  if (user.role === "STUDENT") {
    const adminContact = await getPlatformConfigValue("admin_contact");

    return (
      <div className="space-y-6 sm:space-y-8">
        <section id="wallet" className="scroll-mt-24">
          <WalletPageClient role="STUDENT" userId={user.id} adminContact={adminContact} />
        </section>
      </div>
    );
  }

  const payments = await getPaymentsList(tenant.id);
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <section id="expenses">
        <PaymentsPageClient
          initialPayments={clientPayments}
          initialStatus={initialStatus}
          initialStudentQuery={initialStudentQuery}
        />
      </section>
    </div>
  );
}
