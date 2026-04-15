'use client';

import { useMemo, useState } from "react";
import { MessageSquare, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getInitials, toArabicDigits } from "@/lib/utils";
import { AddStudentForm } from "@/modules/students/components/AddStudentForm";

type StudentPaymentStatus = "PAID" | "OVERDUE" | "PENDING";

type GroupOption = {
  id: string;
  name: string;
  remainingCapacity: number;
  isFull: boolean;
};

type StudentItem = {
  id: string;
  name: string;
  studentPhone: string;
  parentName: string;
  parentPhone: string;
  parentId?: string;
  grade: string;
  gradeLevel: string;
  group: string;
  groupId: string;
  enrollmentStatus?: string;
  studentStatus: "ACTIVE" | "SUSPENDED";
  consecutiveAbsences: number;
  paymentStatus: StudentPaymentStatus;
  attendance: number;
  amountDue: number;
};

type FilterValue = "ALL" | "PAID" | "OVERDUE";

function paymentBadge(status: StudentPaymentStatus) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (status === "OVERDUE") return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
}

function paymentLabel(status: StudentPaymentStatus) {
  if (status === "PAID") return "مدفوع";
  if (status === "OVERDUE") return "متأخر";
  return "مستحق السداد";
}

const filters: Array<{ label: string; value: FilterValue }> = [
  { label: "الكل", value: "ALL" },
  { label: "مدفوع", value: "PAID" },
  { label: "متأخر", value: "OVERDUE" },
];

export function StudentsPageClient({ students, groups }: { students: StudentItem[]; groups: GroupOption[] }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("ALL");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  async function handleDeleteStudent(studentId: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;
    try {
      const res = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
      if (res.ok) window.location.reload();
      else alert("فشل حذف الطالب");
    } catch {
      alert("حدث خطأ أثناء الحذف");
    }
  }

  async function handleStatusChange(studentId: string, status: "ACTIVE" | "SUSPENDED" | "REJECTED") {
    try {
      const res = await fetch(`/api/students/${studentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) window.location.reload();
    } catch {
      alert("حدث خطأ أثناء تغيير الحالة");
    }
  }

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return students.filter((student) => {
      // Exclude pending enrollment requests from the main list
      if (student.enrollmentStatus === "PENDING") return false;

      const matchesFilter = activeFilter === "ALL" ? true : student.paymentStatus === activeFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        student.name.toLowerCase().includes(normalizedQuery) ||
        student.group.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query, students]);

  const uniqueStudents = filteredStudents.filter(
    (student, index, self) =>
      index === self.findIndex((s) => s.id === student.id)
  );

  function statusLabel(status?: string) {
    if (status === "ACTIVE") return "نشط";
    if (status === "SUSPENDED") return "موقوف";
    if (status === "REJECTED") return "مرفوض";
    return "نشط";
  }

  function statusBadge(status?: string) {
    if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
    if (status === "SUSPENDED") return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    if (status === "REJECTED") return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300";
    return "bg-emerald-100 text-emerald-700";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">الطلاب</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">بحث سريع ومؤشرات واضحة للحضور والسداد لكل طالب.</p>
        </div>
        <div className="w-full sm:w-auto">
          <AddStudentForm groups={groups} />
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-slate-400" />
            <Input
              className="ps-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الطالب أو المجموعة"
              value={query}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                className={`touch-target rounded-full px-4 py-2 text-sm font-bold transition ${
                  activeFilter === filter.value
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* طلبات الانضمام المعلقة */}
      {students.filter((s) => s.enrollmentStatus === "PENDING").length > 0 && (
        <Card className="overflow-hidden border-amber-200 dark:border-amber-900">
          <CardContent className="space-y-3 pt-4">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
              طلبات الانضمام المعلقة
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {students.filter((s) => s.enrollmentStatus === "PENDING").length}
              </span>
            </h2>

            <div className="grid gap-3">
              {students.filter((s) => s.enrollmentStatus === "PENDING").map((student) => (
                <div key={`${student.id}-${student.groupId}`} className="flex items-center justify-between gap-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
                    <p className="text-sm text-slate-500">{student.grade} - {student.group}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/students/${student.id}/status`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "ACTIVE", groupId: student.groupId }),
                        });
                        if (res.ok) window.location.reload();
                      }}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                    >
                      ✅ قبول
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/students/${student.id}/status`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "REJECTED", groupId: student.groupId }),
                        });
                        if (res.ok) window.location.reload();
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                    >
                      ❌ رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {uniqueStudents.map((student, index) => (
          <Card key={student.id}>
            <CardContent className="space-y-4">
              {/* Header الكارد */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-extrabold text-white"
                    style={{ background: index % 2 === 0 ? "linear-gradient(135deg, #1A5276, #2E86C1)" : "linear-gradient(135deg, #117A65, #48C9B0)" }}
                  >
                    {getInitials(student.name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{student.name}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{student.grade}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-2 text-xs font-bold ${paymentBadge(student.paymentStatus)}`}>
                    {paymentLabel(student.paymentStatus)}
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenStatusId(openStatusId === student.id ? null : student.id)}
                      className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold ${statusBadge(student.studentStatus)}`}
                    >
                      {statusLabel(student.studentStatus)}
                      <span className="text-[10px]">▼</span>
                    </button>

                    {openStatusId === student.id && (
                      <>
                        <button
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenStatusId(null)}
                        />
                        <div className="absolute left-0 top-9 z-20 w-36 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
                          <button
                            type="button"
                            onClick={() => { setOpenStatusId(null); handleStatusChange(student.id, "ACTIVE"); }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            ✅ نشط
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenStatusId(null); handleStatusChange(student.id, "SUSPENDED"); }}
                            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-right text-sm font-bold text-amber-600 hover:bg-amber-50 dark:border-slate-800 dark:hover:bg-amber-950/30"
                          >
                            ⏸ موقوف
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenStatusId(null); handleStatusChange(student.id, "REJECTED"); }}
                            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-right text-sm font-bold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:hover:bg-rose-950/30"
                          >
                            ❌ مرفوض
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 3 نقاط */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <span className="text-lg leading-none text-slate-500">⋮</span>
                    </button>

                    {openMenuId === student.id && (
                      <>
                        <button
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute left-0 top-9 z-20 w-44 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
                          {/* تعديل */}
                          <span onClick={(e) => e.stopPropagation()}>
                            <AddStudentForm
                              groups={groups}
                              student={{
                                id: student.id,
                                name: student.name,
                                studentPhone: student.studentPhone,
                                parentName: student.parentName,
                                parentPhone: student.parentPhone,
                                gradeLevel: student.gradeLevel,
                                groupId: student.groupId,
                              }}
                            />
                          </span>

                          {/* راسل ولي الأمر */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              if (student.parentId) {
                                window.location.href = `/messages?contact=${student.parentId}`;
                              } else if (student.parentPhone) {
                                const phone = student.parentPhone.replace(/^0/, "20");
                                const message = encodeURIComponent("مرحباً، لديك رسالة على منصة السنتر التعليمية.");
                                window.location.href = `https://wa.me/${phone}?text=${message}`;
                              }
                            }}
                            className="flex w-full items-center gap-2 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            <MessageSquare className="h-4 w-4" />
                            راسل ولي الأمر
                          </button>

                          {/* حذف */}
                          <button
                            type="button"
                            onClick={() => { setOpenMenuId(null); handleDeleteStudent(student.id); }}
                            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-right text-sm font-bold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:hover:bg-rose-950/30"
                          >
                            <span>🗑️</span>
                            حذف الطالب
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300">{student.group}</p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                الغياب المتتالي: {toArabicDigits(student.consecutiveAbsences)} حصة
              </p>

              <div className="flex items-center justify-between gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle className="stroke-slate-200 dark:stroke-slate-700" cx="50" cy="50" fill="none" r="42" strokeWidth="8" />
                    <circle
                      className="stroke-primary"
                      cx="50"
                      cy="50"
                      fill="none"
                      r="42"
                      strokeDasharray={`${2.64 * student.attendance} 999`}
                      strokeLinecap="round"
                      strokeWidth="8"
                    />
                  </svg>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{toArabicDigits(student.attendance)}%</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">نسبة الحضور</p>
                  <Progress className="mt-2 h-2.5" value={student.attendance} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500 dark:text-slate-300">
            لا توجد نتائج مطابقة للبحث أو الفلتر المحدد.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
