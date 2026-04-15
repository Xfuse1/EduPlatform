export const dynamic = "force-dynamic";

import { Building2, CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";

import { ScheduleTimeline } from "@/components/data-display/ScheduleTimeline";
import { StatsCard } from "@/components/data-display/StatsCard";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { formatTimeRange12Hour } from "@/lib/utils";
import { getTeacherScheduleItems } from "@/modules/groups/queries";

export default async function CenterSchedulePage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (user.role !== "CENTER_ADMIN") {
    redirect(user.role === "STUDENT" ? "/student" : user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const items = await getTeacherScheduleItems(tenant.id);
  const rooms = new Set(items.map((item) => item.room));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard icon={CalendarDays} title="إجمالي الفترات" tone="petrol" value={String(items.length)} />
        <StatsCard icon={Building2} title="القاعات المستخدمة" tone="teal" value={String(rooms.size)} />
      </div>

      <ScheduleTimeline
        items={items.map((item) => ({
          id: item.id,
          title: item.subject,
          dayLabel: item.day,
          timeLabel: formatTimeRange12Hour(item.timeStart, item.timeEnd),
          location: item.room,
          statusLabel: item.isToday ? "اليوم" : undefined,
          accentColor: item.color,
        }))}
        title="جدول القاعات والمدرسين"
      />
    </div>
  );
}
