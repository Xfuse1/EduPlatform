'use client';

import { Download, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Record = {
  id: string;
  studentName: string;
  groupName: string;
  date: string | Date;
  status: string;
  method: string;
  markedAt: string | Date;
};

export function ManagerAttendanceTable({ initialRecords }: { initialRecords: Record[] }) {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filteredRecords = useMemo(() => {
    return initialRecords.filter((r) => {
      const matchSearch =
        r.studentName.includes(query) || r.groupName.includes(query);
      const matchDate = !dateFilter || new Date(r.date).toISOString().split('T')[0] === dateFilter;
      return matchSearch && matchDate;
    });
  }, [initialRecords, query, dateFilter]);

  const exportCSV = () => {
    const header = "اسم الطالب,المجموعة,التاريخ,الحالة,الطريقة,وقت التسجيل\n";
    const body = filteredRecords
      .map((r) => 
        `${r.studentName},${r.groupName},${new Date(r.date).toLocaleDateString('ar-EG')},${r.status},${r.method},${new Date(r.markedAt).toLocaleTimeString('ar-EG')}`
      )
      .join("\n");
      
    const blob = new Blob(["\ufeff" + header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_export_${new Date().toISOString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle className="text-xl font-bold">كل سجلات الحضور</CardTitle>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          تصدير CSV
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="ابحث عن طالب أو مادة..."
              className="ps-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">تصفية بالتاريخ</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter("")}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900 whitespace-nowrap"
                >
                  مسح
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="relative overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-start text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-start">الطالب</th>
                <th className="px-6 py-4 text-start">المجموعة</th>
                <th className="px-6 py-4 text-start">التاريخ</th>
                <th className="px-6 py-4 text-start">الحالة</th>
                <th className="px-6 py-4 text-start">الطريقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length ? filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{r.studentName}</td>
                  <td className="px-6 py-4">{r.groupName}</td>
                  <td className="px-6 py-4">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        statusLabel(r.status)
                    )}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{r.method}</td>
                </tr>
              )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        لا توجد سجلات مطابقة للبحث
                    </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function statusLabel(status: string) {
    if (status === 'PRESENT') return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    if (status === 'LATE') return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
