import { cache } from "react";

import { MOCK_PAYMENT_SNAPSHOT, MOCK_REVENUE_SUMMARY } from "@/lib/mock-data";

export const getRevenueSummary = cache(async (_tenantId: string) => {
  return MOCK_REVENUE_SUMMARY;
});

export const getStudentPaymentSnapshot = cache(async (_tenantId: string, _studentId: string) => {
  return MOCK_PAYMENT_SNAPSHOT;
});
