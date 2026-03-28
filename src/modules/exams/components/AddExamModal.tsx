'use client';

import { Calendar, Save, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Group {
  id: string;
  name: string;
}

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onAdd: (exam: any) => void;
}

export function AddExamModal({ isOpen, onClose, groups, onAdd }: AddExamModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    groupId: groups[0]?.id || "",
    examDate: "",
    durationMinutes: "60",
    maxScore: "100",
    examLink: "",
    file: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Fake Mock behavior since DB logic will be integrated by backend dev
      const mockResult = {
          id: Math.random().toString(),
          title: formData.title,
          description: formData.description,
          examDate: formData.examDate,
          durationMinutes: parseInt(formData.durationMinutes),
          maxScore: parseInt(formData.maxScore),
          groupId: formData.groupId,
          group: { name: groups.find(g => g.id === formData.groupId)?.name || "بدون مجموعة" },
          status: "upcoming",
          _count: { submissions: 0 }
      };

      // Mock delay
      await new Promise(r => setTimeout(r, 600));

      onAdd(mockResult);
      onClose();
      setFormData({ title: "", description: "", groupId: groups[0]?.id || "", examDate: "", durationMinutes: "60", maxScore: "100", examLink: "", file: null });
    } catch (error) {
      console.error("Failed to add exam:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-900 border-b pb-4 dark:text-white">إضافة امتحان جديد</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-bold text-slate-700 dark:text-slate-200">عنوان الامتحان</Label>
            <Input
              id="title"
              placeholder="مثال: امتحان الشهر الأول - فيزياء"
              required
              className="min-h-11 text-sm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupId" className="text-sm font-bold text-slate-700 dark:text-slate-200">المجموعة المختبرة</Label>
            <select
              id="groupId"
              className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 shadow-sm"
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examDate" className="text-sm font-bold text-slate-700 dark:text-slate-200">تاريخ ووقت الامتحان</Label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="examDate"
                      type="datetime-local"
                      required
                      className="ps-10 min-h-11 text-sm block w-full"
                      value={formData.examDate}
                      onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-sm font-bold text-slate-700 dark:text-slate-200">مدة الامتحان (بالدقائق)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  required
                  placeholder="مثال: 60"
                  className="min-h-11 text-sm font-bold text-center"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                />
              </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxScore" className="text-sm font-bold text-slate-700 dark:text-slate-200">الدرجة النهائية</Label>
            <Input
              id="maxScore"
              type="number"
              min="1"
              required
              placeholder="مثال: 100"
              className="min-h-11 text-sm font-bold text-center w-32"
              value={formData.maxScore}
              onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">مرفقات الامتحان (اختياري)</Label>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="examLink" className="text-xs text-slate-500 font-bold">رابط امتحان إلكتروني (Google Forms الموثقة)</Label>
                <div className="relative">
                  <LinkIcon className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="examLink"
                    placeholder="https://docs.google.com/forms..."
                    className="pr-10 min-h-10 text-sm text-left"
                    dir="ltr"
                    value={formData.examLink}
                    onChange={(e) => setFormData({ ...formData, examLink: e.target.value })}
                  />
                </div>
              </div>

              <div className="relative flex items-center py-2">
                 <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                 <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold">أو</span>
                 <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="text-xs text-slate-500 font-bold">نموذج الامتحان المطبوع (PDF)</Label>
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
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button type="button" variant="outline" className="flex-1 min-h-12 border-slate-200" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="flex-1 min-h-12 shadow-primary/20 bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? "جاري الحفظ..." : (
                  <>
                    <Save className="me-2 h-5 w-5" />
                    حفظ الامتحان
                  </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
