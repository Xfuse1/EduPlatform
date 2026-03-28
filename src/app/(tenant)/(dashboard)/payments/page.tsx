export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { PaymentsPageClient } from "@/modules/payments/components/PaymentsPageClient";
import { getPaymentsList } from "@/modules/payments/queries";

type PaymentsPageProps = {
  searchParams: Promise<{
    student?: string;
    status?: string;
  }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const tenant = await requireTenant();
  await requireAuth();

  const params = await searchParams;
  const initialStudentQuery = params.student ?? "";
  const initialStatus = params.status === "PAID" || params.status === "OVERDUE" || params.status === "PENDING" ? params.status : "ALL";
  const payments = await getPaymentsList(tenant.id);

  return (
    <PaymentsPageClient
      initialPayments={payments}
      initialStatus={initialStatus}
      initialStudentQuery={initialStudentQuery}
    />
  );
}
