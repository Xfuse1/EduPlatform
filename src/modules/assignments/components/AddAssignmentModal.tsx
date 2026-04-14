'use client';

import { Calendar, Save, X, Plus, Clock, Link as LinkIcon, Lock, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

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
        answerKeyUrl 
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
        } else {
          onAdd?.(result.assignment);
        }
        onClose();
        setFormData({ title: "", description: "", groupId: groups[0]?.id || "", dueDate: "", fileLink: "", file: null, answerKeyFile: null });
      }
    } catch (error) {
      console.error("Failed to add assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-900 border-b pb-4 dark:text-white">
            {initialData ? "تعديل الواجب" : "إضافة واجب جديد"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">

          {/* عنوان الواجب */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-bold text-slate-700 dark:text-slate-200">
              عنوان الواجب <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="مثال: واجب الدرس الأول - الحركة في اتجاه واحد"
              required
              className="min-h-12 text-sm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* المجموعة + تاريخ التسليم في صف واحد */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupId" className="text-sm font-bold text-slate-700 dark:text-slate-200">
                المجموعة <span className="text-rose-500">*</span>
              </Label>
              <select
                id="groupId"
                className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
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
                className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 cursor-pointer"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                onClick={(e) => (e.target as HTMLInputElement).showPicker()}
              />
            </div>
          </div>

          {/* الوصف */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-bold text-slate-700 dark:text-slate-200">
              وصف / ملاحظات
              <span className="mr-2 text-xs font-normal text-slate-400">(اختياري)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="اكتب تفاصيل الواجب هنا..."
              rows={3}
              className="text-sm resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* المرفقات */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              مرفقات الواجب
              <span className="mr-2 text-xs font-normal text-slate-400">(اختياري)</span>
            </p>

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
                  className="pr-10 text-sm"
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

            {/* ملف الأسئلة */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <FileText className="h-3 w-3" />
                ملف الأسئلة (يراه الطالب)
              </Label>
              <Input
                id="file"
                type="file"
                className="file:me-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-sm cursor-pointer bg-white dark:bg-slate-900"
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
                className="file:me-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 text-sm cursor-pointer bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormData({ ...formData, answerKeyFile: file });
                }}
              />
            </div>
          </div>

          {/* أزرار */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 min-h-12" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="flex-1 min-h-12" disabled={loading}>
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
