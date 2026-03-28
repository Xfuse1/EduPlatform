'use client';

import { useMemo, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  grade: string;
  gradeLevel: string;
  group: string;
  groupId: string;
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
  return "معلق";
}

const filters: Array<{ label: string; value: FilterValue }> = [
  { label: "الكل", value: "ALL" },
  { label: "مدفوع", value: "PAID" },
  { label: "متأخر", value: "OVERDUE" },
];

export function StudentsPageClient({ students, groups }: { students: StudentItem[]; groups: GroupOption[] }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("ALL");

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return students.filter((student) => {
      const matchesFilter = activeFilter === "ALL" ? true : student.paymentStatus === activeFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        student.name.toLowerCase().includes(normalizedQuery) ||
        student.group.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query, students]);

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredStudents.map((student, index) => (
          <Card key={student.id}>
            <CardContent className="space-y-4">
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
                <span className={`rounded-full px-3 py-2 text-xs font-bold ${paymentBadge(student.paymentStatus)}`}>
                  {paymentLabel(student.paymentStatus)}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300">{student.group}</p>

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

              <div className="flex gap-2">
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
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800"
                  onClick={() => window.location.href = `/messages?contact=${student.id}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  راسل ولي الأمر
                </Button>
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
