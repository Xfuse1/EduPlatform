export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { PaymentsPageClient } from "@/modules/payments/components/PaymentsPageClient";
import { getPaymentsList, getPaymentStudentOptions } from "@/modules/payments/queries";

export default async function CenterPaymentsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const [initialPayments, students] = await Promise.all([
    getPaymentsList(tenant.id),
    getPaymentStudentOptions(tenant.id),
  ]);

  return <PaymentsPageClient initialPayments={initialPayments} initialStatus="ALL" initialStudentQuery="" students={students} />;
}
