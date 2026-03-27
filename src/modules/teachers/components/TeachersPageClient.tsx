'use client';

import { BookOpen, FileText, Mail, Phone, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useState, useTransition } from "react";

import Badge from "@/components/data-display/Badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getInitials, toArabicDigits } from "@/lib/utils";
import { createTeacher, deleteTeacher } from "@/modules/teachers/actions";
import type { TeacherListItem } from "@/modules/teachers/queries";

type TeachersPageClientProps = {
  currentUserId: string;
  initialTeachers: TeacherListItem[];
};

type TeacherFormState = {
  name: string;
  phone: string;
  subject: string;
  email: string;
  bio: string;
};

const emptyFormState: TeacherFormState = {
  name: "",
  phone: "",
  subject: "",
  email: "",
  bio: "",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "لم يسجل دخول بعد";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TeachersPageClient({ currentUserId, initialTeachers }: TeachersPageClientProps) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [query, setQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<TeacherFormState>(emptyFormState);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const recentThreshold = new Date();
  recentThreshold.setDate(recentThreshold.getDate() - 30);

  const filteredTeachers = teachers.filter((teacher) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return (
      teacher.name.toLowerCase().includes(normalizedQuery) ||
      teacher.phone.includes(normalizedQuery) ||
      (teacher.subject ?? "").toLowerCase().includes(normalizedQuery) ||
      (teacher.email ?? "").toLowerCase().includes(normalizedQuery)
    );
  });

  const summaryCards = [
    {
      label: "إجمالي المدرسين",
      value: toArabicDigits(teachers.length),
      icon: Users,
    },
    {
      label: "المجموعات المرتبطة",
      value: toArabicDigits(teachers.reduce((sum, teacher) => sum + teacher.groupsCount, 0)),
      icon: BookOpen,
    },
    {
      label: "الطلاب المرتبطون",
      value: toArabicDigits(teachers.reduce((sum, teacher) => sum + teacher.studentsCount, 0)),
      icon: Users,
    },
    {
      label: "تسجيلات دخول حديثة",
      value: toArabicDigits(
        teachers.filter((teacher) => teacher.lastLoginAt && new Date(teacher.lastLoginAt) >= recentThreshold).length,
      ),
      icon: UserPlus,
    },
  ];

  const resetForm = () => {
    setForm(emptyFormState);
    setError("");
    setIsDialogOpen(false);
  };

  const handleFieldChange = (field: keyof TeacherFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateTeacher = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.subject.trim()) {
      setError("يرجى إدخال اسم المدرس ورقم الهاتف والمادة.");
      return;
    }

    setError("");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await createTeacher({
        name: form.name.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        email: form.email.trim(),
        bio: form.bio.trim(),
      });

      if (!result.success || !result.teacher) {
        setError(result.message ?? "تعذر إضافة المدرس");
        return;
      }

      setTeachers((current) => [result.teacher, ...current.filter((teacher) => teacher.id !== result.teacher.id)]);
      setSuccessMessage(result.message ?? "تم إضافة المدرس بنجاح.");
      resetForm();
    });
  };

  const handleDeleteTeacher = (teacherId: string, teacherName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المدرس ${teacherName}؟`)) {
      return;
    }

    setError("");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await deleteTeacher({ id: teacherId });

      if (!result.success) {
        setError(result.message ?? "تعذر حذف المدرس");
        return;
      }

      setTeachers((current) => current.filter((teacher) => teacher.id !== teacherId));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/70 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">مدرسين</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            إدارة قائمة المدرسين داخل السنتر مع بيانات المادة والتواصل والحسابات الجاهزة لتسجيل الدخول.
          </p>
        </div>

        <Button className="gap-2 self-start lg:self-auto" onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="h-4 w-4" />
          إضافة مدرس
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label}>
              <CardContent className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-sky-400/10 dark:text-sky-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-slate-400" />
            <Input
              className="ps-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم المدرس أو المادة أو الهاتف أو البريد الإلكتروني"
              value={query}
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            عند حفظ المدرس يتم إنشاء حساب `TEACHER` له فورًا داخل نفس السنتر، ويمكنه تسجيل الدخول مباشرة برقم الهاتف.
          </p>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          {successMessage}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTeachers.map((teacher, index) => (
          <Card key={teacher.id}>
            <CardContent className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-extrabold text-white"
                    style={{
                      background:
                        index % 2 === 0
                          ? "linear-gradient(135deg, #1A5276, #2E86C1)"
                          : "linear-gradient(135deg, #117A65, #48C9B0)",
                    }}
                  >
                    {getInitials(teacher.name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{teacher.name}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      تمت إضافته في {formatDateTime(teacher.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="primary">{teacher.subject ?? "بدون مادة"}</Badge>
                  <Badge variant="success">حساب جاهز</Badge>
                </div>
              </div>

              <div className="rounded-[18px] bg-slate-50 p-4 dark:bg-slate-900">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <Phone className="h-4 w-4" />
                    <span dir="ltr">{teacher.phone}</span>
                  </div>

                  {teacher.email ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <Mail className="h-4 w-4" />
                      <span dir="ltr" className="truncate">
                        {teacher.email}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <BookOpen className="h-4 w-4" />
                    <span>{teacher.subject ?? "لم يتم تحديد المادة بعد"}</span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  آخر تسجيل دخول: {formatDateTime(teacher.lastLoginAt)}
                </p>
              </div>

              {teacher.bio ? (
                <div className="rounded-[18px] border border-slate-200 p-4 dark:border-slate-800">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <FileText className="h-4 w-4" />
                    <span>نبذة سريعة</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{teacher.bio}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-slate-200 p-4 text-center dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">المجموعات</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                    {toArabicDigits(teacher.groupsCount)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-slate-200 p-4 text-center dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">الطلاب</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                    {toArabicDigits(teacher.studentsCount)}
                  </p>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                disabled={isPending || teacher.id === currentUserId}
                onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                type="button"
                variant="outline"
              >
                <Trash2 className="h-4 w-4" />
                {teacher.id === currentUserId ? "حسابك الحالي" : "حذف المدرس"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeachers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500 dark:text-slate-300">
            لا توجد نتائج مطابقة للبحث أو لم يتم إضافة مدرسين بعد.
          </CardContent>
        </Card>
      ) : null}

      {isDialogOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
          <div className="w-full max-w-xl rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)] dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">إضافة مدرس</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  سيتم إنشاء حساب المدرس تلقائيًا بمجرد الحفظ، ويمكنه تسجيل الدخول برقم هاتفه داخل نفس السنتر.
                </p>
              </div>
              <Button onClick={resetForm} type="button" variant="ghost">
                إغلاق
              </Button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleCreateTeacher}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">اسم المدرس</label>
                  <Input
                    onChange={(event) => handleFieldChange("name", event.target.value)}
                    placeholder="مثال: أحمد محمود"
                    value={form.name}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">رقم الهاتف</label>
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    onChange={(event) => handleFieldChange("phone", event.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="01012345678"
                    value={form.phone}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">المادة</label>
                  <Input
                    onChange={(event) => handleFieldChange("subject", event.target.value)}
                    placeholder="مثال: رياضيات"
                    value={form.subject}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    البريد الإلكتروني
                    <span className="me-1 text-xs font-normal text-slate-400">(اختياري)</span>
                  </label>
                  <Input
                    dir="ltr"
                    onChange={(event) => handleFieldChange("email", event.target.value)}
                    placeholder="teacher@example.com"
                    type="email"
                    value={form.email}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    نبذة أو ملاحظات
                    <span className="me-1 text-xs font-normal text-slate-400">(اختياري)</span>
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-secondary focus:ring-4 focus:ring-secondary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    onChange={(event) => handleFieldChange("bio", event.target.value)}
                    placeholder="مثال: متخصص في التأسيس والمتابعة الأسبوعية لطلاب المرحلة الإعدادية."
                    rows={4}
                    value={form.bio}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                رقم الهاتف الذي تدخله هنا هو نفس الرقم الذي سيستخدمه المدرس لتسجيل الدخول إلى حسابه.
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3">
                <Button className="w-full" disabled={isPending} type="submit">
                  {isPending ? "جارٍ الحفظ..." : "حفظ المدرس"}
                </Button>
                <Button className="w-full" onClick={resetForm} type="button" variant="outline">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
