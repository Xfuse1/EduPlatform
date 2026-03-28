import Link from "next/link";
import { Clock3, ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getSessionStatusLabel, toArabicDigits } from "@/lib/utils";
import { getAttendanceSessionsList, getAllAttendanceRecords } from "@/modules/attendance/queries";
import { ManagerAttendanceTable } from "@/modules/attendance/components/ManagerAttendanceTable";
import { StartSessionButton } from "@/modules/attendance/components/StartSessionButton";

function statusBorder(status: string) {
  if (status === "IN_PROGRESS") return "border-s-4 border-s-emerald-500";
  if (status === "SCHEDULED") return "border-s-4 border-s-sky-500";
  return "border-s-4 border-s-slate-500";
}

export default async function AttendancePage() {
  const tenant = await requireTenant();
  const user = await requireAuth();
  const sessions = await getAttendanceSessionsList(tenant.id);
  
  const isManager = ["MANAGER", "ADMIN", "TEACHER", "ASSISTANT"].includes(user.role);
  const records = isManager ? await getAllAttendanceRecords(tenant.id) : [];

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">جلسات اليوم</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">اختر جلسة لبدء تسجيل الحضور أو متابعة الطلاب.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const progress = session.total > 0 ? Math.round((session.attended / session.total) * 100) : 0;

            return (
              <Link key={session.id} href={`/attendance/${session.id}`} className="block transition group hover:-translate-y-1">
                <Card className={statusBorder(session.status)}>
                  <CardContent className="min-h-20 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition">{session.title}</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 capitalize">{session.group}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {getSessionStatusLabel(session.status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        <span dir="ltr">
                          {session.timeStart} - {session.timeEnd}
                        </span>
                      </span>
                      {session.status === "SCHEDULED" ? (
                        <StartSessionButton sessionId={session.id} status={session.status} />
                      ) : (
                        <Button variant="ghost" className="text-primary font-bold group min-h-10 px-4 py-2">
                          متابعة <ArrowRight className="ms-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span>الحاضرون</span>
                        <span>
                          {toArabicDigits(session.attended)} من {toArabicDigits(session.total)}
                        </span>
                      </div>
                      <Progress className="h-2.5" value={progress} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {isManager && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">إحصائيات وتقارير</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">سجل كامل بجميع عمليات الحضور المسجلة عبر المنصة.</p>
            </div>
            <ManagerAttendanceTable initialRecords={records as any} />
          </div>
      )}
    </div>
  );
}
