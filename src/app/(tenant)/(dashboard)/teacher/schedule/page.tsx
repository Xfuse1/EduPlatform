export const dynamic = "force-dynamic";

import { CalendarDays, Clock3, DoorOpen } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";
import { getTeacherScheduleItems } from "@/modules/groups/queries";

export default async function TeacherSchedulePage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const teacherScopeUserId = getTeacherScopeUserId(tenant, user);
  const sessions = await getTeacherScheduleItems(user.tenantId, teacherScopeUserId ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">الجدول</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">جدول الحصص الأسبوعي الفعلي المستخرج من بيانات المجموعات.</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <CalendarDays className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">لا توجد حصص مجدولة بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sessions.map((session) => (
            <Card key={session.id} className={session.isToday ? "border-primary dark:border-sky-400" : undefined}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{session.subject}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{session.day}</p>
                  </div>
                  {session.isToday ? (
                    <span className="rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary dark:bg-sky-400/10 dark:text-sky-300">
                      اليوم
                    </span>
                  ) : null}
                </div>

                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Clock3 className="h-4 w-4" />
                  <span dir="ltr">
                    {session.timeStart} - {session.timeEnd}
                  </span>
                </p>

                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <DoorOpen className="h-4 w-4" />
                  <span>{session.room}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
