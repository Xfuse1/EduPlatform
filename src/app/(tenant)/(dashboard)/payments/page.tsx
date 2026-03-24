export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";
import { PaymentsPageClient } from "@/modules/payments/components/PaymentsPageClient";
import { getPaymentsList, getPaymentStudentOptions } from "@/modules/payments/queries";

type PaymentsPageProps = {
  searchParams: Promise<{
    student?: string;
    status?: string;
  }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const tenant = await requireTenant();
  const user = await requireAuth();
  const teacherScopeUserId = getTeacherScopeUserId(tenant, user);

  const [params, initialPayments, students] = await Promise.all([
    searchParams,
    getPaymentsList(tenant.id, teacherScopeUserId ?? undefined),
    getPaymentStudentOptions(tenant.id, teacherScopeUserId ?? undefined),
  ]);

  const initialStudentQuery = params.student ?? "";
  const initialStatus =
    params.status === "PAID" || params.status === "PARTIAL" || params.status === "OVERDUE" || params.status === "PENDING"
      ? params.status
      : "ALL";

  return (
    <PaymentsPageClient
      initialPayments={initialPayments}
      initialStatus={initialStatus}
      initialStudentQuery={initialStudentQuery}
      students={students}
    />
  );
}
