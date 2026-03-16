export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { MOCK_PAYMENTS } from "@/lib/mock-data";
import { PaymentsPageClient } from "@/modules/payments/components/PaymentsPageClient";

type PaymentsPageProps = {
  searchParams: Promise<{
    student?: string;
    status?: string;
  }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  await requireAuth();

  const params = await searchParams;
  const initialStudentQuery = params.student ?? "";
  const initialStatus = params.status === "PAID" || params.status === "OVERDUE" || params.status === "PENDING" ? params.status : "ALL";

  return (
    <PaymentsPageClient
      initialPayments={MOCK_PAYMENTS}
      initialStatus={initialStatus}
      initialStudentQuery={initialStudentQuery}
    />
  );
}
