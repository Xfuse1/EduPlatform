import { cache } from "react";

import { MOCK_PARENT_CHILDREN, MOCK_STUDENT_COUNT_SUMMARY, MOCK_STUDENT_PROFILE } from "@/lib/mock-data";

export const getStudentCountSummary = cache(async (_tenantId: string) => {
  return MOCK_STUDENT_COUNT_SUMMARY;
});

export const getStudentProfile = cache(async (_tenantId: string, _studentId: string) => {
  return MOCK_STUDENT_PROFILE;
});

export const getParentChildren = cache(async (_tenantId: string, _parentId: string) => {
  return MOCK_PARENT_CHILDREN;
});
