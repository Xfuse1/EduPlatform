'use client';

import { useMemo, useState } from "react";
import { Download, MessageSquare, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getInitials, toArabicDigits } from "@/lib/utils";
import { AddStudentForm } from "@/modules/students/components/AddStudentForm";
import CSVImporter from "@/modules/students/components/CSVImporter";

type StudentPaymentStatus = "PAID" | "PARTIAL" | "OVERDUE" | "PENDING";

type GroupOption = {
  id: string;
  name: string;
  gradeLevel: string;
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
  studentStatus: "ACTIVE" | "SUSPENDED" | "PENDING";
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

function enrollmentStatusLabel(status?: string) {
  if (status === "ACTIVE") return "نشط";
  if (status === "WAITLIST") return "قائمة انتظار";
  if (status === "PENDING") return "معلق";
  if (status === "ARCHIVED") return "مؤرشف";
  if (status === "DROPPED") return "منسحب";
  if (status === "NONE") return "بدون مجموعة";
  return status ?? "";
}

function csvCell(value: string | number | undefined) {
  let text = String(value ?? "");
  // Neutralize spreadsheet formula/CSV injection: cells starting with =, +, -, @,
  // tab, or CR are treated as formulas by Excel/Sheets. Prefix with an apostrophe.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | undefined>>) {
  const csvContent = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

export function StudentsPageClient({ students, groups, tenantId, canAddStudents = true }: { students: StudentItem[]; groups: GroupOption[]; tenantId: string; canAddStudents?: boolean }) {
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
    if (status === "PENDING") return "معلق";
    return "نشط";
  }

  function statusBadge(status?: string) {
    if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
    if (status === "SUSPENDED") return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    if (status === "REJECTED") return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300";
    if (status === "PENDING") return "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300";
    return "bg-emerald-100 text-emerald-700";
  }

  function exportStudents() {
    const studentsById = students.reduce((acc, student) => {
      const list = acc.get(student.id) ?? [];
      list.push(student);
      acc.set(student.id, list);
      return acc;
    }, new Map<string, StudentItem[]>());

    const headers = [
      "كود الطالب",
      "اسم الطالب",
      "رقم الطالب",
      "اسم ولي الأمر",
      "رقم ولي الأمر",
      "كود ولي الأمر",
      "الصف",
      "المستوى",
      "المجموعات",
      "أكواد المجموعات",
      "حالات الانضمام",
      "حالة الطالب",
      "حالة السداد",
      "نسبة الحضور",
      "الغياب المتتالي",
      "المبلغ المستحق",
    ];
    const rows = Array.from(studentsById.values()).map((studentRows) => {
      const student = studentRows[0];
      const groups = uniqueValues(studentRows.map((item) => item.group));
      const groupIds = uniqueValues(studentRows.map((item) => item.groupId));
      const enrollmentStatuses = uniqueValues(studentRows.map((item) => enrollmentStatusLabel(item.enrollmentStatus)));
      // amountDue originates from the student's single latest payment and is repeated
      // on every enrollment row, so take it once per student instead of summing.
      const amountDue = student.amountDue;
      const maxConsecutiveAbsences = Math.max(...studentRows.map((item) => item.consecutiveAbsences));

      return [
        student.id,
        student.name,
        student.studentPhone,
        student.parentName,
        student.parentPhone,
        student.parentId,
        student.grade,
        student.gradeLevel,
        groups.join(" | "),
        groupIds.join(" | "),
        enrollmentStatuses.join(" | "),
        statusLabel(student.studentStatus),
        paymentLabel(student.paymentStatus),
        `${student.attendance}%`,
        maxConsecutiveAbsences,
        amountDue,
      ];
    });

    downloadCsv(`students_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  return (
    <div className="space-y-8">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00B8A0]/10 text-[#00B8A0]">
                <Download className="h-6 w-6" />
             </div>
             <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              إدارة الطلاب
            </h1>
          </div>
          <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            تابع مستويات الطلاب، الحضور، والمدفوعات. يمكنك إضافة الطلاب يدوياً أو عبر استيراد ملف Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportStudents}
            className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Download className="h-5 w-5" />
            تصدير البيانات
          </button>
          
          {canAddStudents && (
            <div className="h-[52px]">
               <AddStudentForm groups={groups} />
            </div>
          )}
        </div>
      </div>

      {/* --- QUICK ACTIONS / IMPORT SECTION --- */}
      {canAddStudents && (
        <section className="relative overflow-hidden rounded-[28px] border border-[#00B8A0]/20 bg-white/40 p-1 dark:bg-white/[0.02]">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#00B8A0]/10 blur-[80px]" />
          <div className="relative rounded-[24px] bg-white/80 p-6 backdrop-blur-xl dark:bg-slate-950/50">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#00B8A0]/10 px-4 py-1.5 text-xs font-bold text-[#00B8A0]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00B8A0] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00B8A0]" />
                  </span>
                  استيراد ذكي
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  هل لديك قائمة طلاب جاهزة؟
                </h2>
                <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  ارفع ملف الطلاب (CSV/Excel) وسنتولى نحن مطابقة البيانات وتنظيمها لك في ثوانٍ معدودة.
                </p>
              </div>
              
              <div className="rounded-3xl bg-slate-50/50 p-2 dark:bg-white/5">
                <CSVImporter groups={groups} tenantId={tenantId} hideHeader />
              </div>
            </div>
          </div>
        </section>
      )}

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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {uniqueStudents.map((student, index) => (
          <Card 
            key={student.id} 
            className="group relative overflow-hidden border-slate-200/60 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#00B8A0]/30 hover:shadow-[0_20px_40px_rgba(0,184,160,0.08)] dark:border-white/5 dark:bg-white/[0.03]"
          >
            <CardContent className="p-6">
              {/* Header: Avatar + Info + Actions */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-black text-white shadow-lg shadow-black/5"
                    style={{ 
                      background: index % 2 === 0 
                        ? "linear-gradient(135deg, #00B8A0, #00D1B2)" 
                        : "linear-gradient(135deg, #1A2B6D, #2E4C9D)" 
                    }}
                  >
                    {getInitials(student.name)}
                  </div>
                  <div className="space-y-1">
                    <h2 className="line-clamp-1 text-lg font-bold text-slate-900 dark:text-white">
                      {student.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#00B8A0]">
                        {student.grade}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-xs font-medium text-slate-500">
                        {student.group}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 transition-colors hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="text-lg leading-none text-slate-500">⋮</span>
                    </button>

                    {openMenuId === student.id && (
                      <>
                        <button
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute left-0 top-11 z-20 w-48 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
                          <div className="p-1">
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
                              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                            >
                              <MessageSquare className="h-4 w-4 text-[#00B8A0]" />
                              راسل ولي الأمر
                            </button>

                            <button
                              type="button"
                              onClick={() => { setOpenMenuId(null); handleDeleteStudent(student.id); }}
                              className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-slate-100 px-4 py-3 text-right text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:border-white/5 dark:hover:bg-rose-950/30"
                            >
                              <span className="text-lg">🗑️</span>
                              حذف الطالب
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${paymentBadge(student.paymentStatus)}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${student.paymentStatus === 'PAID' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {paymentLabel(student.paymentStatus)}
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenStatusId(openStatusId === student.id ? null : student.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${statusBadge(student.studentStatus)}`}
                  >
                    {statusLabel(student.studentStatus)}
                    <span className="text-[10px] opacity-60">▼</span>
                  </button>

                  {openStatusId === student.id && (
                    <>
                      <button
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenStatusId(null)}
                      />
                      <div className="absolute left-0 top-10 z-20 w-40 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
                        <div className="p-1">
                          <button
                            type="button"
                            onClick={() => { setOpenStatusId(null); handleStatusChange(student.id, "ACTIVE"); }}
                            className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-right text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            نشط
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenStatusId(null); handleStatusChange(student.id, "SUSPENDED"); }}
                            className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-right text-sm font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          >
                            موقوف
                          </button>
                          <button
                            type="button"
                            onClick={() => { setOpenStatusId(null); handleStatusChange(student.id, "REJECTED"); }}
                            className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-right text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            مرفوض
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Attendance & Progress */}
              <div className="mt-4 rounded-2xl bg-slate-50/50 p-4 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">نسبة الحضور</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{toArabicDigits(student.attendance)}%</p>
                  </div>
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle className="stroke-slate-200/50 dark:stroke-white/5" cx="50" cy="50" fill="none" r="42" strokeWidth="10" />
                      <circle
                        className="stroke-[#00B8A0] transition-all duration-1000"
                        cx="50"
                        cy="50"
                        fill="none"
                        r="42"
                        strokeDasharray={`${2.64 * student.attendance} 999`}
                        strokeLinecap="round"
                        strokeWidth="10"
                      />
                    </svg>
                  </div>
                </div>
                <Progress className="mt-4 h-2 bg-slate-200 dark:bg-white/5" value={student.attendance} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/5">
                <p className="text-xs font-bold text-slate-500">الغياب المتتالي</p>
                <span className={`rounded-lg px-2 py-1 text-xs font-black ${student.consecutiveAbsences >= 3 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'} dark:bg-white/5`}>
                  {toArabicDigits(student.consecutiveAbsences)} حصص
                </span>
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
