'use client';

import { Calendar, Save, X, Plus, Clock, Link as LinkIcon, Lock, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import { showToast } from "@/components/ui/Toast";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildStorageFilePath } from "@/lib/storage-file-name";

interface Group {
  id: string;
  name: string;
}

interface AddAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onAdd?: (assignment: any) => void;
  onUpdate?: (assignment: any) => void;
  initialData?: any;
}

export function AddAssignmentModal({ isOpen, onClose, groups, onAdd, onUpdate, initialData }: AddAssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    groupId: initialData?.groupId || groups[0]?.id || "",
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : "",
    fileLink: initialData?.fileUrl && !initialData.fileUrl.includes('supabase') ? initialData.fileUrl : "",
    file: null as File | null,
    answerKeyFile: null as File | null,
    maxGrade: initialData?.maxGrade || 100,
  });

  // Re-initialize form when initialData changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: initialData?.title || "",
        description: initialData?.description || "",
        groupId: initialData?.groupId || groups[0]?.id || "",
        dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : "",
        fileLink: initialData?.fileUrl && !initialData.fileUrl.includes('supabase') ? initialData.fileUrl : "",
        file: null,
        answerKeyFile: null,
        maxGrade: initialData?.maxGrade || 100,
      });
    }
  }, [isOpen, initialData, groups]);

  const uploadFile = async (file: File, filePath: string) => {
    const { data, error } = await supabase.storage
      .from("assignments")
      .upload(filePath, file)
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from("assignments")
      .getPublicUrl(filePath)
    
    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = formData.fileLink;
      let answerKeyUrl = "";

      if (formData.file) {
        fileUrl = await uploadFile(
          formData.file,
          buildStorageFilePath({
            folder: "questions",
            file: formData.file,
            parts: [formData.title],
          }),
        );
      }

      if (formData.answerKeyFile) {
        answerKeyUrl = await uploadFile(
          formData.answerKeyFile,
          buildStorageFilePath({
            folder: "answer-keys",
            file: formData.answerKeyFile,
            parts: [formData.title, "answer-key"],
          }),
        );
      }

      // Note: Backend engineer will update this to use FormData if handling actual files
      // Currently kept as JSON for mock/compatibility until backend is ready.
      const payload = { 
        ...formData, 
        file: undefined, 
        answerKeyFile: undefined,
        fileUrl,
        answerKeyUrl,
        maxGrade: formData.maxGrade,
      }; 
      
      const isEditing = !!initialData?.id;
      const url = isEditing ? `/api/assignments/${initialData.id}` : "/api/assignments";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        if (isEditing) {
          onUpdate?.(result.assignment);
          showToast.success("تم تحديث الواجب بنجاح");
        } else {
          onAdd?.(result.assignment);
          showToast.success("تم إضافة الواجب بنجاح");
        }
        onClose();
        setFormData({ title: "", description: "", groupId: groups[0]?.id || "", dueDate: "", fileLink: "", file: null, answerKeyFile: null, maxGrade: 100 });
      } else {
        const errorData = await res.json();
        showToast.error(errorData.error || "حدث خطأ أثناء حفظ الواجب");
      }
    } catch (error: any) {
      console.error("Failed to add/update assignment:", error);
      showToast.error(error.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(760px,calc(100vw-2rem))] max-h-[92vh] overflow-hidden border-slate-200 bg-white p-0 shadow-[0_30px_90px_rgba(2,8,23,0.38)] dark:border-slate-800 dark:bg-slate-950" dir="rtl">
        <DialogHeader className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/35">
          <DialogTitle className="text-center text-2xl font-extrabold text-slate-950 dark:text-white">
            {initialData ? "تعديل الواجب" : "إضافة واجب جديد"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">

          <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 md:grid-cols-2">
            {/* عنوان الواجب */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title" className="text-sm font-bold text-slate-700 dark:text-slate-200">
                عنوان الواجب <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="مثال: واجب الدرس الأول - الحركة في اتجاه واحد"
                required
                className="min-h-12 rounded-xl bg-white text-sm font-medium shadow-none dark:bg-slate-950"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

          {/* المجموعة + تاريخ التسليم في صف واحد */}
            <div className="space-y-2">
              <Label htmlFor="groupId" className="text-sm font-bold text-slate-700 dark:text-slate-200">
                المجموعة <span className="text-rose-500">*</span>
              </Label>
              <select
                id="groupId"
                className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-bold text-slate-700 dark:text-slate-200">
                تاريخ التسليم <span className="text-rose-500">*</span>
              </Label>
              <input
                id="dueDate"
                type="date"
                required
                className="w-full min-h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).showPicker()}
              />
            </div>
          {/* الدرجة النهائية */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="maxGrade" className="text-sm font-bold text-slate-700 dark:text-slate-200">
              الدرجة النهائية للواجب
              <span className="mr-2 text-xs font-normal text-slate-400">(سيصحح الـ AI بناءً عليها)</span>
            </Label>
            <Input
              id="maxGrade"
              type="number"
              min={1}
              max={1000}
              required
              className="min-h-12 rounded-xl bg-white text-center text-sm font-bold dark:bg-slate-950"
              value={formData.maxGrade}
              onChange={(e) => setFormData({ ...formData, maxGrade: Number(e.target.value) })}
            />
          </div>

          {/* الوصف */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description" className="text-sm font-bold text-slate-700 dark:text-slate-200">
              وصف / ملاحظات
              <span className="mr-2 text-xs font-normal text-slate-400">(اختياري)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="اكتب تفاصيل الواجب هنا..."
              rows={3}
              className="min-h-[92px] resize-none rounded-xl bg-white text-sm font-medium dark:bg-slate-950"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          </div>

          {/* المرفقات */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/20">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                مرفقات الواجب
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">اختياري</span>
            </div>

            {/* رابط خارجي */}
            <div className="space-y-2">
              <Label htmlFor="fileLink" className="text-xs text-slate-500 font-bold">
                رابط خارجي (Google Drive, OneDrive...)
              </Label>
              <div className="relative">
                <LinkIcon className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="fileLink"
                  placeholder="https://..."
                  className="min-h-12 rounded-xl bg-slate-50 pr-10 text-sm dark:bg-slate-950"
                  dir="ltr"
                  value={formData.fileLink}
                  onChange={(e) => setFormData({ ...formData, fileLink: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              <span className="text-xs font-bold text-slate-400">أو</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            </div>

            {/* عرض الملف الحالي إن وجد */}
            {initialData?.fileUrl && !formData.file && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800">
                <FileText className="h-3 w-3 text-primary" />
                <span>الملف الحالي: </span>
                <a href={initialData.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline truncate max-w-[200px]">
                  {decodeURIComponent(initialData.fileUrl.split('/').pop() || 'عرض الملف')}
                </a>
              </div>
            )}

            {/* ملف الأسئلة */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <FileText className="h-3 w-3" />
                ملف الأسئلة (يراه الطالب)
              </Label>
              <Input
                id="file"
                type="file"
                className="min-h-12 cursor-pointer rounded-xl bg-slate-50 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20 dark:bg-slate-950"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormData({ ...formData, file });
                }}
              />
            </div>

            {/* ملف الإجابات */}
            <div className="space-y-2">
              <Label htmlFor="answerKeyFile" className="text-xs text-slate-500 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-500" />
                  ملف الإجابات النموذجية
                </span>
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold">
                  سري — لن يراه الطالب
                </span>
              </Label>
              <Input
                id="answerKeyFile"
                type="file"
                className="min-h-12 cursor-pointer rounded-xl border-amber-200 bg-slate-50 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-700 hover:file:bg-amber-200 dark:border-amber-900/50 dark:bg-slate-950"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormData({ ...formData, answerKeyFile: file });
                }}
              />
            </div>
          </div>
            {/* عرض ملف الإجابات الحالي إن وجد */}
            {initialData?.answerKeyUrl && !formData.answerKeyFile && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-600 dark:bg-amber-900/20">
                <Lock className="h-3 w-3" />
                <span>نموذج الإجابة الحالي محفوظ ✓</span>
              </div>
            )}
          </div>

          {/* أزرار */}
          <div className="grid gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:grid-cols-2">
            <Button type="button" variant="outline" className="min-h-12 border-slate-200 font-bold dark:border-slate-700" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="min-h-12 font-bold shadow-md" disabled={loading}>
              {loading ? "جاري الحفظ..." : (
                <>
                  <Save className="me-2 h-4 w-4" />
                  حفظ الواجب
                </>
              )}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
