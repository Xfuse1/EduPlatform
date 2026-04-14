'use client';

import { BookOpen, Calendar, Plus, Users, Search, ClipboardList, Loader2, Trash2, CheckCircle2, Pencil } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeArabicText, toArabicDigits } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import { AddAssignmentModal } from "./AddAssignmentModal";
import { AssignmentSubmissionsModal } from "./AssignmentSubmissionsModal";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | string;
  groupId: string;
  group: { name: string };
  submissions?: { grade: number | null; student: { name: string } }[];
  _count: { submissions: number };
}

interface AssignmentsPageClientProps {
  initialAssignments: Assignment[];
  groups: { id: string, name: string }[];
}

export function AssignmentsPageClient({ initialAssignments, groups }: AssignmentsPageClientProps) {
  const searchParams = useSearchParams();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [filterGroupId, setFilterGroupId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const normalizedQuery = normalizeArabicText(searchQuery);

  useEffect(() => {
    const autoOpen = searchParams.get("autoOpen");
    
    if (autoOpen === "true") {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const filtered = assignments.filter((a) => {
    const matchesGroup = filterGroupId === "all" || a.groupId === filterGroupId;
    const matchesAssignmentTitle = normalizeArabicText(a.title).includes(normalizedQuery);
    const matchesStudentName = a.submissions?.some((submission) =>
      normalizeArabicText(submission.student.name).includes(normalizedQuery),
    ) ?? false;
    const matchesSearch = normalizedQuery.length === 0 || matchesAssignmentTitle || matchesStudentName;
    return matchesGroup && matchesSearch;
  });

  const handleAdd = (newAssignment: any) => {
      setAssignments((currentAssignments) => [newAssignment, ...currentAssignments]);
  };

  const handleUpdate = (updated: any) => {
    setAssignments((currentAssignments) => 
      currentAssignments.map(a => a.id === updated.id ? { ...a, ...updated } : a)
    );
    setEditingAssignment(null);
  };

  const handleDelete = async (assignmentId: string, assignmentTitle: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الواجب "${assignmentTitle}"؟`)) {
      return;
    }

    setDeletingAssignmentId(assignmentId);

    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "تعذر حذف الواجب الآن");
      }

      setAssignments((currentAssignments) =>
        currentAssignments.filter((assignment) => assignment.id !== assignmentId),
      );

      if (selectedAssignmentId === assignmentId) {
        setSelectedAssignmentId(null);
      }

      showToast.success("تم حذف الواجب بنجاح");
    } catch (error) {
      console.error("Failed to delete assignment:", error);
      showToast.error(error instanceof Error ? error.message : "تعذر حذف الواجب الآن");
    } finally {
      setDeletingAssignmentId((currentId) => (currentId === assignmentId ? null : currentId));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">نظام الواجبات</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">إدارة وتقييم الواجبات المنزلية لجميع المجموعات.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="min-h-12 px-6">
          <Plus className="me-2 h-5 w-5" />
          إضافة واجب جديد
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">البحث باسم الواجب أو الطالب</label>
              <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="ابحث عن واجب أو طالب..." 
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
                className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
              >
                  <option value="all">كل المجموعات</option>
                  {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
              </select>
          </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((assignment) => (
          <Card key={assignment.id} className="group relative transition hover:-translate-y-1">
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition">{assignment.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <BookOpen className="h-4 w-4" />
                      {assignment.group.name}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    onClick={() => setEditingAssignment(assignment)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    aria-label={`حذف الواجب ${assignment.title}`}
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-xl border border-rose-200 bg-rose-50 p-0 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
                    onClick={() => handleDelete(assignment.id, assignment.title)}
                    disabled={deletingAssignmentId === assignment.id}
                  >
                    {deletingAssignmentId === assignment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm font-medium">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-xs">التسليم: {new Date(assignment.dueDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">{toArabicDigits(assignment._count.submissions)} تسليمات</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">{toArabicDigits(assignment.submissions?.filter((submission) => submission.grade !== null).length ?? 0)} تم تصحيح</span>
                  </div>
              </div>

                <div className="pt-2">
                  <Button variant="outline" className="w-full font-bold group" onClick={() => setSelectedAssignmentId(assignment.id)}>
                      عرض التفاصيل والتصحيح
                      <ClipboardList className="ms-2 h-4 w-4" />
                  </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center dark:bg-slate-900">
                    <ClipboardList className="h-10 w-10 text-slate-300" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">لا توجد واجبات</h3>
                    <p className="text-slate-500 text-sm">ابدأ بإضافة أول واجب لطلابك الآن.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} variant="outline">إضافة واجب</Button>
            </div>
        )}
      </div>

      <AddAssignmentModal 
        isOpen={isModalOpen || !!editingAssignment} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingAssignment(null);
        }} 
        groups={groups}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        initialData={editingAssignment}
      />

      <AssignmentSubmissionsModal
        assignmentId={selectedAssignmentId}
        onClose={() => setSelectedAssignmentId(null)}
      />
    </div>
  );
}
