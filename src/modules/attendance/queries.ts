import { cache } from "react";

import { MOCK_ATTENDANCE_OVERVIEW, MOCK_STUDENT_ATTENDANCE, MOCK_TODAY_SESSIONS } from "@/lib/mock-data";

export const getTodaySessions = cache(async (_tenantId: string) => {
  return MOCK_TODAY_SESSIONS;
});

export const getAttendanceOverview = cache(async (_tenantId: string) => {
  return MOCK_ATTENDANCE_OVERVIEW;
});

export const getStudentAttendanceSnapshot = cache(async (_tenantId: string, _studentId: string) => {
  return MOCK_STUDENT_ATTENDANCE;
});
