'use client';

import { useState } from "react";
import { User, Phone, Mail, Camera, Loader2, Save, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PinSettingsCard } from "@/modules/settings/components/PinSettingsCard";

interface StudentSettingsPageProps {
  initialData: {
    id: string;
    name: string;
    phone: string;
    avatarUrl: string | null;
    email?: string | null;
    gradeLevel?: string | null;
    hasPin: boolean;
  };
}

export function StudentSettingsPage({ initialData }: StudentSettingsPageProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState(initialData.name);
  const [isSaving, setIsSaving] = useState(false);

  const isChanged = name.trim() !== initialData.name;

  async function handleSaveName() {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/student/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("تم تحديث الاسم بنجاح ✓");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ الاسم");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const saveRes = await fetch("/api/student/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: data.url }),
      });

      if (!saveRes.ok) throw new Error("فشل حفظ الصورة");

      setAvatarUrl(data.url);
      toast.success("تم تحديث الصورة بنجاح ✓");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل رفع الصورة");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">الإعدادات</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">إدارة بيانات حسابك الشخصية.</p>
      </div>

      <PinSettingsCard phone={initialData.phone} hasPin={initialData.hasPin} />

      <Card className="rounded-[24px] border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg font-bold">
            <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
              <User className="h-5 w-5 text-sky-600" />
            </div>
            بيانات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Avatar */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <div className="h-24 w-24 rounded-3xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-700 shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={initialData.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>

              <input
                type="file"
                id="student-avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              <label
                htmlFor="student-avatar-upload"
                className="absolute -bottom-2 -right-2 h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-lg hover:bg-sky-700 transition-colors cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>
            </div>

            <div className="text-center sm:text-start">
              <h3 className="font-bold text-slate-900 dark:text-white">الصورة الشخصية</h3>
              <p className="text-sm text-slate-500 mt-1">PNG، JPG — بحد أقصى 2MB</p>
            </div>
          </div>

          {/* بيانات ثابتة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">الاسم الكامل</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">رقم الهاتف</label>
              <div className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                <Phone className="h-4 w-4" />
                {initialData.phone}
              </div>
            </div>

            {initialData.gradeLevel && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">المرحلة الدراسية</label>
                <div className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                  <GraduationCap className="h-4 w-4" />
                  {initialData.gradeLevel}
                </div>
              </div>
            )}
          </div>

          {isChanged && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveName}
                disabled={isSaving}
                className="h-12 px-8 rounded-2xl font-bold bg-sky-600 hover:bg-sky-700 text-white"
              >
                {isSaving ? (
                  <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
                ) : (
                  <><Save className="ml-2 h-4 w-4" /> حفظ التغييرات</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
