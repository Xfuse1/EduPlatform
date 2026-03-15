import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, toArabicDigits } from "@/lib/utils";

type TeacherDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getTeacherDashboardData>>;
};

function StatCard({ title, value, hint }: { title: string; value: React.ReactNode; hint: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
        <div className="text-sm text-slate-600">{hint}</div>
      </CardContent>
    </Card>
  );
}

export function TeacherDashboard({ data }: TeacherDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hint={`${data.revenue.change >= 0 ? "↗" : "↘"} مقارنة بالشهر السابق`}
          title="💰 إيرادات الشهر"
          value={formatCurrency(data.revenue.thisMonth)}
        />
        <StatCard
          hint={
            <>
              (<span dir="ltr">{toArabicDigits(data.outstanding.count)}</span> طالب)
            </>
          }
          title="⚠️ المتأخرات"
          value={formatCurrency(data.outstanding.total)}
        />
        <StatCard
          hint={
            <>
              (+<span dir="ltr">{toArabicDigits(data.students.recent)}</span> جديد)
            </>
          }
          title="👨‍🎓 إجمالي الطلاب"
          value={toArabicDigits(data.students.total)}
        />
        <StatCard
          hint={`${data.attendance.change >= 0 ? "↗" : "↘"} من آخر فترة`}
          title="✅ نسبة الحضور"
          value={`${toArabicDigits(data.attendance.rate)}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>حصص اليوم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.todaySessions.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد حصص اليوم</p>
          ) : (
            data.todaySessions.map((session) => (
              <div key={session.id} className="rounded-2xl border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{session.group.name}</p>
                    <p className="text-sm text-slate-500">
                      <span dir="ltr">
                        {session.timeStart} - {session.timeEnd}
                      </span>
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">{session.status}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>التنبيهات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.alerts.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد تنبيهات حالية</p>
          ) : (
            data.alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="font-semibold text-amber-900">{alert.message}</p>
                <p className="mt-1 text-sm text-amber-800">{formatCurrency(alert.amount)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
