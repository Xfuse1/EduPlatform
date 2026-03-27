import { StatsCard } from "@/components/data-display/StatsCard";
import { InvoiceCard } from "@/components/data-display/InvoiceCard";
import { NotificationCenter } from "@/components/data-display/NotificationCenter";
import { StudentProgressCard } from "@/components/data-display/StudentProgressCard";
import { toArabicDigits } from "@/lib/utils";

type ParentDashboardProps = {
  data: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getParentDashboardData>>;
};

export function ParentDashboard({ data }: ParentDashboardProps) {
  const firstChild = data.children[0];
  const averageAttendance = data.children.length
    ? Math.round(data.children.reduce((sum, child) => sum + child.attendanceRate, 0) / data.children.length)
    : 0;
  const totalOutstanding = data.children.reduce((sum, child) => sum + (child.payment.status === "PAID" ? 0 : child.payment.amount), 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="عدد الأبناء" tone="petrol" value={toArabicDigits(data.children.length)} />
        <StatsCard title="متوسط الحضور" tone="teal" value={`${toArabicDigits(averageAttendance)}%`} />
        <StatsCard title="مبالغ تحتاج متابعة" tone="amber" value={toArabicDigits(totalOutstanding)} />
        <StatsCard title="آخر حالة اليوم" tone="ink" value={firstChild ? (firstChild.todayStatus === "PRESENT" ? "حضر" : firstChild.todayStatus === "ABSENT" ? "غاب" : "لا يوجد") : "لا يوجد"} />
      </section>

      {data.children.map((child) => (
        <section key={child.id} className="grid gap-6 xl:grid-cols-[1fr_0.9fr_0.9fr]">
          <StudentProgressCard
            attendanceRate={child.attendanceRate}
            homeworkCompletion={78}
            note={`الابن ${child.name} في ${child.grade}، ويمكنك متابعة الحصة القادمة والفاتورة من نفس الشاشة.`}
            streakLabel={child.todayStatus === "PRESENT" ? "حضر آخر حصة" : "يحتاج متابعة اليوم"}
            studentName={child.name}
          />
          <InvoiceCard
            actionHref={`/parent/${child.id}`}
            actionLabel="عرض التفاصيل"
            amount={child.payment.amount}
            description={child.payment.status === "PAID" ? "تم سداد الاشتراك الحالي بالكامل." : "يوجد رصيد يحتاج مراجعة مع إدارة السنتر."}
            dueDateLabel="الفاتورة الحالية"
            invoiceNumber={`PAR-${child.id.slice(-4)}`}
            status={child.payment.status}
          />
          <NotificationCenter
            items={[
              {
                id: `${child.id}-attendance`,
                title: "حالة الحضور",
                description: child.todayStatus === "PRESENT" ? `${child.name} تم تسجيل حضوره.` : child.todayStatus === "ABSENT" ? `${child.name} غاب اليوم ويحتاج تواصل.` : `لا توجد حصة مسجلة لـ ${child.name} اليوم.`,
                isUnread: child.todayStatus !== "NONE",
                timeLabel: "اليوم",
              },
              {
                id: `${child.id}-session`,
                title: "الحصة القادمة",
                description: child.nextSession ? `${child.nextSession.group.name} في ${child.nextSession.timeStart}.` : "لا توجد حصة قادمة مثبتة بعد.",
                timeLabel: "مجدول",
              },
            ]}
            title={`متابعة ${child.name}`}
          />
        </section>
      ))}
    </div>
  );
}
