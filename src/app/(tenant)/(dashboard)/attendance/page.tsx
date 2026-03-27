export const dynamic = "force-dynamic";

import { Clock3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireAuth } from "@/lib/auth";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { requireTenant } from "@/lib/tenant";
import { getSessionStatusLabel, toArabicDigits } from "@/lib/utils";
import { getAttendanceSessions } from "@/modules/attendance/queries";

function statusBorder(status: string) {
  if (status === "IN_PROGRESS") return "border-s-4 border-s-emerald-500";
  if (status === "SCHEDULED") return "border-s-4 border-s-sky-500";
  return "border-s-4 border-s-slate-500";
}

export default async function AttendancePage() {
  const user = await requireAuth();
  const tenant = await requireTenant();
  const teacherScopeUserId = getTeacherScopeUserId(tenant, user);
  const sessions = await getAttendanceSessions(tenant.id, teacherScopeUserId ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">الحضور</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">الجلسات الفعلية المسجلة في قاعدة البيانات مع حالات الحضور والامتلاء.</p>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-slate-500 dark:text-slate-300">لا توجد جلسات حضور مسجلة حتى الآن.</CardContent>
          </Card>
        ) : (
          sessions.map((session) => {
            const progress = session.total === 0 ? 0 : Math.round((session.attended / session.total) * 100);

            return (
              <Card key={session.id} className={statusBorder(session.status)}>
                <CardContent className="min-h-20 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{session.title}</h2>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{session.group}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {getSessionStatusLabel(session.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      <span dir="ltr">
                        {session.timeStart} - {session.timeEnd}
                      </span>
                    </span>
                    <span>{session.remaining}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <span>الحضور</span>
                      <span>
                        {toArabicDigits(session.attended)} من {toArabicDigits(session.total)}
                      </span>
                    </div>
                    <Progress className="h-3" value={progress} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
