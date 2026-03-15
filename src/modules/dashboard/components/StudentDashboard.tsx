import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, toArabicDigits } from "@/lib/utils";

type StudentDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getStudentDashboardData>>;
};

export function StudentDashboard({ data }: StudentDashboardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>الحصة القادمة</CardTitle>
        </CardHeader>
        <CardContent>
          {data.nextSession ? (
            <div className="space-y-2">
              <p className="text-lg font-bold text-slate-900">{data.nextSession.group.name}</p>
              <p className="text-sm text-slate-600">
                <span dir="ltr">{new Date(data.nextSession.date).toLocaleDateString("ar-EG")}</span>
              </p>
              <p className="text-sm text-slate-600">
                <span dir="ltr">
                  {data.nextSession.timeStart} - {data.nextSession.timeEnd}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">لا توجد حصة قادمة مسجلة الآن</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>نسبة الحضور هذا الشهر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={data.attendance.rate} />
          <p className="text-sm font-semibold text-slate-700">{toArabicDigits(data.attendance.rate)}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>حالة المصروفات</CardTitle>
        </CardHeader>
        <CardContent>
          {data.payment.status === "PAID" ? (
            <p className="font-semibold text-emerald-700">تم السداد ✅</p>
          ) : (
            <p className="font-semibold text-amber-700">{formatCurrency(data.payment.amount)} متبقي</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مجموعاتي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.profile?.enrollments.length ? (
            data.profile.enrollments.map((enrollment) => (
              <div key={enrollment.group.id} className="rounded-2xl border px-4 py-3">
                <p className="font-bold text-slate-900">{enrollment.group.name}</p>
                <p className="mt-1 text-sm text-slate-500">{enrollment.group.days.join(" • ")}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">لا توجد مجموعات مسجلة</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
