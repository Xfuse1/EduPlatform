import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, toArabicDigits } from "@/lib/utils";

type ParentDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getParentDashboardData>>;
};

function todayStatusLabel(status: string) {
  if (status === "PRESENT") return "حضر ✅";
  if (status === "ABSENT") return "غاب ⚠️";
  return "لا توجد حصة اليوم";
}

export function ParentDashboard({ data }: ParentDashboardProps) {
  return (
    <div className="space-y-4">
      {data.children.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">لا توجد بيانات أبناء مرتبطة بهذا الحساب</CardContent>
        </Card>
      ) : (
        data.children.map((child) => (
          <Card key={child.id}>
            <CardHeader>
              <CardTitle>{child.name}</CardTitle>
              <p className="text-sm text-slate-500">{child.grade}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">اليوم: {todayStatusLabel(child.todayStatus)}</p>
              <p className="text-sm text-slate-700">
                المصروفات: {child.payment.status === "PAID" ? "تم السداد ✅" : `${formatCurrency(child.payment.amount)} متبقي`}
              </p>
              <div>
                <p className="mb-2 text-sm text-slate-700">نسبة الحضور</p>
                <Progress value={child.attendanceRate} />
                <p className="mt-2 text-xs text-slate-500">{toArabicDigits(child.attendanceRate)}%</p>
              </div>
              <p className="text-sm text-slate-700">
                الحصة القادمة: {child.nextSession ? `${child.nextSession.group.name} - ${child.nextSession.timeStart}` : "لا توجد حصة قادمة"}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
