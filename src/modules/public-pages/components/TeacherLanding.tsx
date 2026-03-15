import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCapacity, formatCurrency } from "@/lib/utils";

type TeacherLandingProps = {
  teacher: {
    name: string;
    logoUrl: string | null;
    themeColor: string;
    region: string | null;
    bio: string | null;
    subjects: string[];
  };
  groups: Array<{
    id: string;
    name: string;
    days: string[];
    timeStart: string;
    timeEnd: string;
    monthlyFee: number;
    enrolledCount: number;
    maxCapacity: number;
    remainingCapacity: number;
    isFull: boolean;
  }>;
};

export function TeacherLanding({ teacher, groups }: TeacherLandingProps) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border bg-white shadow-soft">
        <div className="px-5 py-8 sm:px-8 sm:py-10" style={{ backgroundColor: `${teacher.themeColor}18` }}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-slate-600">صفحة التعريف العامة</p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">{teacher.name}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {teacher.subjects.map((subject) => (
                  <span key={subject} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                    {subject}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-base leading-8 text-slate-700">{teacher.bio ?? "خبرة في تأسيس ومتابعة الطلاب مع نظام واضح للحضور والتحصيل."}</p>
              <p className="mt-3 text-sm font-medium text-slate-600">المنطقة: {teacher.region ?? "غير محددة"}</p>
            </div>

            <div className="rounded-[28px] bg-white p-5 shadow-soft">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-extrabold text-white"
                style={{ backgroundColor: teacher.themeColor }}
              >
                {teacher.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={teacher.name} className="h-full w-full rounded-full object-cover" src={teacher.logoUrl} />
                ) : (
                  teacher.name.slice(0, 1)
                )}
              </div>
              <Link
                className="touch-target mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
                href="/register"
              >
                سجّل ابنك الآن
              </Link>
            </div>
          </div>
        </div>

        <div className="px-5 py-8 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">المجموعات المتاحة</h2>
              <p className="mt-2 text-sm text-slate-600">اختر المجموعة الأنسب من حيث الأيام والمواعيد والسعة المتبقية.</p>
            </div>
            <Link
              className="touch-target hidden min-h-11 items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 sm:inline-flex"
              href="/register"
            >
              سجّل ابنك الآن
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: group.isFull ? "#ef4444" : teacher.themeColor }} />
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{group.days.join(" • ")}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                      {group.isFull ? "ممتلئة" : "متاحة"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    الموعد <span dir="ltr">{group.timeStart} - {group.timeEnd}</span>
                  </p>
                  <p className="text-sm font-semibold text-primary">{formatCurrency(group.monthlyFee)}</p>
                  <p className="text-sm text-slate-600">السعة الحالية: {formatCapacity(group.enrolledCount, group.maxCapacity)}</p>
                  <p className="text-sm text-slate-600">
                    الأماكن المتبقية: <span dir="ltr">{group.remainingCapacity}</span>
                  </p>
                  {group.isFull ? (
                    <button
                      className="touch-target inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
                      disabled
                      type="button"
                    >
                      سجّل ابنك الآن
                    </button>
                  ) : (
                    <Link
                      className="touch-target inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
                      href="/register"
                    >
                      سجّل ابنك الآن
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
