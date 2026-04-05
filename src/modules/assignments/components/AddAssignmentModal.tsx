'use client';

import { Calendar, Save, X, Plus, Clock, Link as LinkIcon, Lock, FileText } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Group {
  id: string;
  name: string;
}

interface AddAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onAdd: (assignment: any) => void;
}

export function AddAssignmentModal({ isOpen, onClose, groups, onAdd }: AddAssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    groupId: groups[0]?.id || "",
    dueDate: "",
    fileLink: "",
    file: null as File | null,
    answerKeyFile: null as File | null,
  });

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage
      .from("assignments")
      .upload(fileName, file)
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from("assignments")
      .getPublicUrl(fileName)
    
    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = formData.fileLink;
      let answerKeyUrl = "";

      if (formData.file) {
        fileUrl = await uploadFile(formData.file, "questions");
      }

      if (formData.answerKeyFile) {
        answerKeyUrl = await uploadFile(formData.answerKeyFile, "answer-keys");
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
      
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        onAdd(result.assignment);
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-900 border-b pb-4 dark:text-white">إضافة واجب جديد</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-bold text-slate-700 dark:text-slate-200">عنوان الواجب</Label>
            <Input
              id="title"
              placeholder="مثال: واجب الدرس الأول - الحركة في اتجاه واحد"
              required
              className="min-h-12 text-sm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupId" className="text-sm font-bold text-slate-700 dark:text-slate-200">المجموعة</Label>
            <select
              id="groupId"
              className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 shadow-sm"
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-sm font-bold text-slate-700 dark:text-slate-200">تاريخ التسليم</Label>
            <div className="relative">
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="dueDate"
                  type="date"
                  required
                  className="ps-10 min-h-12 text-sm block w-full"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-bold text-slate-700 dark:text-slate-200">وصف / ملاحظات (اختياري)</Label>
            <Textarea
              id="description"
              placeholder="اكتب تفاصيل الواجب هنا..."
              rows={3}
              className="text-sm min-h-24 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/50">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">مرفقات الواجب (اختياري)</Label>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fileLink" className="text-xs text-slate-500 font-bold">رابط خارجي (Google Drive, OneDrive...)</Label>
                <div className="relative">
                  <LinkIcon className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="fileLink"
                    placeholder="https://..."
                    className="pr-10 min-h-10 text-sm text-left"
                    dir="ltr"
                    value={formData.fileLink}
                    onChange={(e) => setFormData({ ...formData, fileLink: e.target.value })}
                  />
                </div>
              </div>

              <div className="relative flex items-center py-2">
                 <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                 <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold">أو</span>
                 <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="text-xs text-slate-500 font-bold flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  ملف الأسئلة (يراه الطالب)
                </Label>
                <div className="relative">
                    <Input
                      id="file"
                      type="file"
                      className="file:me-4 file:py-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-sm cursor-pointer min-h-11 pt-2.5 bg-white dark:bg-slate-900"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, file });
                        }
                      }}
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="answerKeyFile" className="text-xs text-slate-500 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-amber-500" />
                    ملف الإجابات النموذجية
                  </span>
                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">سري - لن يراه الطالب</span>
                </Label>
                <div className="relative">
                    <Input
                      id="answerKeyFile"
                      type="file"
                      className="file:me-4 file:py-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 text-sm cursor-pointer min-h-11 pt-2.5 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, answerKeyFile: file });
                        }
                      }}
                    />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button type="button" variant="outline" className="flex-1 min-h-12" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="flex-1 min-h-12 shadow-primary/20" disabled={loading}>
              {loading ? "جاري الحفظ..." : (
                  <>
                    <Save className="me-2 h-5 w-5" />
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
