'use client';

import { Calendar, Plus, Users, Search, ClipboardCheck, Clock, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AddExamModal } from "./AddExamModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toArabicDigits } from "@/lib/utils";

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
  questions?: any[];
}

interface ExamsPageClientProps {
  initialExams: Exam[];
  groups: { id: string; name: string }[];
}

export function ExamsPageClient({ initialExams = [], groups }: ExamsPageClientProps) {
  const [exams, setExams] = useState<Exam[]>(initialExams || []);
  const [filterGroupId, setFilterGroupId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "true") setIsModalOpen(true);
  }, []);

  const filtered = exams.filter((exam) => {
    const matchesGroup = filterGroupId === "all" || exam.groupId === filterGroupId;
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const handleSuccess = (exam: any) => {
    if (examToEdit) {
      setExams(exams.map((currentExam) => currentExam.id === exam.id ? exam : currentExam));
    } else {
      setExams([exam, ...exams]);
    }
    setExamToEdit(null);
  };

  const openEdit = (exam: any) => {
    setExamToEdit(exam);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setExamToEdit(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الامتحان؟")) return;

    try {
      const response = await fetch(`/api/exams/${id}`, { method: "DELETE" });
      if (response.ok) {
        setExams(exams.filter((exam) => exam.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete exam:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">قادم</Badge>;
      case "active":
        return <Badge variant="outline" className="animate-pulse border-amber-200 bg-amber-50 text-amber-600">متاح الآن</Badge>;
      case "completed":
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-600">مكتمل</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">إدارة الامتحانات</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">قم بتنظيم وجدولة اختبارات المجموعات وتقييم أداء الطلاب.</p>
        </div>
        <Button onClick={openAdd} className="min-h-12 px-6">
          <Plus className="me-2 h-5 w-5" />
          إضافة امتحان جديد
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="exam-search">البحث بالاسم</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              aria-label="البحث عن امتحان"
              id="exam-search"
              placeholder="ابحث عن امتحان..."
              className="min-h-11 ps-10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="exam-group-filter">المجموعة</Label>
          <select
            aria-label="تصفية حسب المجموعة"
            id="exam-group-filter"
            name="exam-group-filter"
            value={filterGroupId}
            onChange={(event) => setFilterGroupId(event.target.value)}
            className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">كل المجموعات</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((exam) => (
          <Card key={exam.id} className="group relative overflow-hidden transition hover:-translate-y-1">
            <div className={`absolute right-0 top-0 h-full w-2 ${exam.status === "active" ? "bg-amber-400" : exam.status === "completed" ? "bg-emerald-400" : "bg-slate-300"}`} />

            <CardContent className="space-y-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 transition group-hover:text-primary dark:text-white">{exam.title}</h3>
                    {getStatusBadge(exam.status)}
                  </div>

                  <div className="flex w-fit items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800">
                    <Users className="h-3 w-3" />
                    {exam.group.name}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    aria-label={`تعديل الامتحان ${exam.title}`}
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-primary"
                    onClick={() => openEdit(exam)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    aria-label={`حذف الامتحان ${exam.title}`}
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                    onClick={() => handleDelete(exam.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 text-sm font-medium">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs">
                    {new Date(exam.examDate).toLocaleDateString("ar-EG", { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Africa/Cairo' })}
                    {" - "}
                    {new Date(exam.examDate).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Cairo' })}
                  </span>
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
                <Button
                  variant="outline"
                  className="group w-full font-bold"
                  onClick={() => {
                    window.location.href = `/teacher/exams/${exam.id}/results`;
                  }}
                >
                  نتائج الامتحان
                  <ClipboardCheck className="ms-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center space-y-4 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center dark:border-slate-800">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
              <ClipboardCheck className="h-10 w-10 text-slate-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا توجد امتحانات</h3>
              <p className="text-sm text-slate-500">قم بتنظيم أول امتحان لطلابك من الزر بالأعلى.</p>
            </div>
          </div>
        )}
      </div>

      <AddExamModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExamToEdit(null);
        }}
        groups={groups}
        onAdd={handleSuccess}
        examToEdit={examToEdit}
      />
    </div>
  );
}
