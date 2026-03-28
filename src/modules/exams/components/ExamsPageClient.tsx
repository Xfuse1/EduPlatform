'use client';

import { Calendar, Plus, Users, Search, ClipboardCheck, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toArabicDigits } from "@/lib/utils";
import { AddExamModal } from "./AddExamModal";
import { Badge } from "@/components/ui/badge";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  examDate: Date | string;
  durationMinutes: number;
  maxScore: number;
  groupId: string;
  group: { name: string };
  status: "upcoming" | "active" | "completed";
  _count: { submissions: number };
}

interface ExamsPageClientProps {
  initialExams: Exam[];
  groups: { id: string, name: string }[];
}

export function ExamsPageClient({ initialExams = [], groups }: ExamsPageClientProps) {
  const [exams, setExams] = useState<Exam[]>(initialExams || []);
  const [filterGroupId, setFilterGroupId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = exams.filter((a) => {
    const matchesGroup = filterGroupId === "all" || a.groupId === filterGroupId;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const handleAdd = (newExam: any) => {
      setExams([newExam, ...exams]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">قادم</Badge>;
      case "active":
        return <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 animate-pulse">متاح الآن</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">مكتمل</Badge>;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">إدارة الامتحانات</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">قم بتنظيم وجدولة اختبارات المجموعات وتقييم أداء الطلاب.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="min-h-12 px-6">
          <Plus className="me-2 h-5 w-5" />
          إضافة امتحان جديد
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">البحث بالاسم</label>
              <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="ابحث عن امتحان..." 
                    className="ps-10 min-h-11"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
          </div>
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">المجموعة</label>
              <select 
                value={filterGroupId}
                onChange={(e) => setFilterGroupId(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 shadow-sm"
              >
                  <option value="all">كل المجموعات</option>
                  {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
              </select>
          </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((exam) => (
          <Card key={exam.id} className="group relative transition hover:-translate-y-1 overflow-hidden">
            <div className={`absolute top-0 right-0 w-2 h-full ${exam.status === 'active' ? 'bg-amber-400' : exam.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition">{exam.title}</h3>
                    {getStatusBadge(exam.status)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 w-fit px-2 py-1 rounded-md">
                      <Users className="h-3 w-3" />
                      {exam.group.name}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm font-medium pt-2">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-xs">{new Date(exam.examDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-xs">{toArabicDigits(exam.durationMinutes)} دقيقة</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">{toArabicDigits(exam.maxScore)} درجة</span>
                  </div>
              </div>

              <div className="pt-2">
                  <Button variant="outline" className="w-full font-bold group">
                      نتائج الامتحان
                      <ClipboardCheck className="ms-2 h-4 w-4" />
                  </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center dark:bg-slate-900">
                    <ClipboardCheck className="h-10 w-10 text-slate-300" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا توجد امتحانات</h3>
                    <p className="text-slate-500 text-sm">قم بتنظيم أول امتحان لطلابك من الزر بالأعلى.</p>
                </div>
            </div>
        )}
      </div>

      <AddExamModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        groups={groups}
        onAdd={handleAdd}
      />
    </div>
  );
}
