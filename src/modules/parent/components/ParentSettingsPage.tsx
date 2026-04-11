'use client';

import { useState } from "react";
import { 
  User, 
  Phone, 
  Save, 
  Loader2, 
  Mail, 
  Bell, 
  Palette, 
  Users, 
  Camera,
  Check,
  Languages
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ParentSettingsPageProps {
  initialData: {
    id: string;
    name: string;
    phone: string;
    avatarUrl: string | null;
    email?: string | null;
    settings?: any;
    parentStudents?: {
      student: {
        id: string;
        name: string;
        avatarUrl: string | null;
        gradeLevel: string | null;
      }
    }[];
  };
}

export function ParentSettingsPage({ initialData }: ParentSettingsPageProps) {
  const [name, setName] = useState(initialData.name);
  const [email, setEmail] = useState(initialData.email || "");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  
  // Settings / Notifications
  const [notifications, setNotifications] = useState({
    attendance: initialData.settings?.notifications?.attendance ?? true,
    exams: initialData.settings?.notifications?.exams ?? true,
    assignments: initialData.settings?.notifications?.assignments ?? true,
  });

  const [language, setLanguage] = useState(initialData.settings?.language || "ar");

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

      // حفظ الـ URL في الداتابيز
      await fetch("/api/parent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: data.url }),
      });

      setAvatarUrl(data.url);
      toast.success("تم تحديث الصورة بنجاح ✓");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل رفع الصورة");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/parent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(),
          email: email.trim() || null,
          settings: {
            ...initialData.settings,
            notifications,
            language,
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل حفظ البيانات");
      }

      toast.success("تم حفظ البيانات بنجاح ✓");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setIsLoading(false);
    }
  }

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isChanged = 
    name !== initialData.name || 
    email !== (initialData.email || "") ||
    JSON.stringify(notifications) !== JSON.stringify(initialData.settings?.notifications ?? { attendance: true, exams: true, assignments: true }) ||
    language !== (initialData.settings?.language || "ar");

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">الإعدادات</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">إدارة بيانات حسابك وتفضيلات التنبيهات.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile & Account */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Account Data Card */}
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
              
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-3xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-700 shadow-md">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <User className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  {/* hidden file input */}
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />

                  <label
                    htmlFor="avatar-upload"
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
                  <p className="text-sm text-slate-500 mt-1">تساعد المعلمين والطلاب على التعرف عليك.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-11 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    رقم الهاتف
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={initialData.phone}
                      disabled
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-500 cursor-not-allowed dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="rounded-[24px] border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg font-bold">
                <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-orange-600" />
                </div>
                تنبيهات النظام
              </CardTitle>
              <CardDescription>اختر التنبيهات التي ترغب في استلامها عبر الرسائل.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'attendance', label: 'حضور وغياب الأبناء', desc: 'تنبيه فوري عند تسجيل حضور أو غياب الابن في الحصة.' },
                { key: 'exams', label: 'نتائج الامتحانات', desc: 'إشعار عند صدور نتائج الاختبارات الشهرية أو الدورية.' },
                { key: 'assignments', label: 'الواجبات والمهام', desc: 'تنبيه بالواجبات الجديدة الموكلة للأبناء.' },
              ].map((item) => (
                <div 
                  key={item.key}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                  onClick={() => toggleNotification(item.key as any)}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <div className={cn(
                    "h-6 w-11 rounded-full relative transition-colors duration-200",
                    notifications[item.key as keyof typeof notifications] ? "bg-sky-600" : "bg-slate-200 dark:bg-slate-700"
                  )}>
                    <div className={cn(
                      "absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform duration-200",
                      notifications[item.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0"
                    )} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Linked Children & Prefs */}
        <div className="space-y-8">
          
          {/* Linked Children Card */}
          <Card className="rounded-[24px] border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg font-bold">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                الأبناء المرتبطون
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {initialData.parentStudents && initialData.parentStudents.length > 0 ? (
                initialData.parentStudents.map((rel) => (
                  <div key={rel.student.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="h-11 w-11 rounded-xl bg-slate-200 overflow-hidden">
                      {rel.student.avatarUrl ? (
                        <img src={rel.student.avatarUrl} alt={rel.student.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                          <User className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{rel.student.name}</p>
                      <p className="text-xs text-slate-500">{rel.student.gradeLevel || 'غير محدد'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-sm">
                  لا يوجد أبناء مرتبطون حالياً.
                </div>
              )}
              <Button variant="outline" className="w-full rounded-xl text-xs border-dashed">
                طلب ربط ابن جديد
              </Button>
            </CardContent>
          </Card>

          {/* Appearance & Language */}
          <Card className="rounded-[24px] border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg font-bold">
                <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-violet-600" />
                </div>
                التفضيلات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <Languages className="h-3 w-3" /> لغة الواجهة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setLanguage("ar")}
                    className={cn(
                      "h-10 rounded-xl text-xs font-bold transition-all border",
                      language === "ar" ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-800" : "bg-transparent border-slate-100 dark:border-slate-800"
                    )}
                  >
                    العربية
                  </button>
                  <button 
                    onClick={() => setLanguage("en")}
                    className={cn(
                      "h-10 rounded-xl text-xs font-bold transition-all border",
                      language === "en" ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-800" : "bg-transparent border-slate-100 dark:border-slate-800"
                    )}
                  >
                    English
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button Fixed for Desktop Side */}
          <div className="sticky bottom-6">
            <Button
              onClick={handleSave}
              disabled={isLoading || !isChanged}
              className="w-full h-14 rounded-[22px] font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xl shadow-sky-200 dark:shadow-none transition-all scale-100 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جارٍ الحفظ...</>
              ) : (
                <><Save className="ml-2 h-5 w-5" /> حفظ جميع التعديلات</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
