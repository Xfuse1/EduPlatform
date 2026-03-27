export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { AttendanceRoster } from "@/components/data-display/AttendanceRoster";
import { ScheduleTimeline } from "@/components/data-display/ScheduleTimeline";
import { OfflineState } from "@/components/shared/OfflineState";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getSessionAttendance, getTodaySessions } from "@/modules/attendance/queries";

export default async function CenterAttendancePage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const todaySessions = await getTodaySessions(tenant.id);
  const focusSession = todaySessions[0] ? await getSessionAttendance(tenant.id, todaySessions[0].id) : null;

  return (
    <div className="space-y-6">
      <OfflineState />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ScheduleTimeline
          items={todaySessions.map((session) => ({
            id: session.id,
            title: session.group.name,
            subtitle: session.status === "IN_PROGRESS" ? "جارية الآن" : "مجدولة اليوم",
            timeLabel: `${session.timeStart} - ${session.timeEnd}`,
            statusLabel: session.status === "IN_PROGRESS" ? "مباشر" : "اليوم",
            accentColor: session.status === "IN_PROGRESS" ? "#0F766E" : "#2E86C1",
          }))}
          title="حصص اليوم"
        />

        <AttendanceRoster
          items={(focusSession?.students ?? []).map((student) => ({
            id: student.id,
            name: student.name,
            attendanceStatus: student.attendanceStatus,
            paymentStatus: student.paymentStatus,
            groupName: focusSession?.session.group.name,
          }))}
          title={focusSession ? `كشف ${focusSession.session.group.name}` : "كشف الحضور"}
        />
      </div>
    </div>
  );
}
