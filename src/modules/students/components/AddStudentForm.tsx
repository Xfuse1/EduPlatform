'use client';

import { Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createStudent, updateStudent } from "@/modules/students/actions";

type GroupOption = {
  id: string;
  name: string;
  remainingCapacity: number;
  isFull: boolean;
};

type EditableStudent = {
  id: string;
  name: string;
  studentPhone: string;
  parentName: string;
  parentPhone: string;
  gradeLevel: string;
  groupId: string;
};

type FormState = {
  studentName: string;
  studentPhone: string;
  parentName: string;
  parentPhone: string;
  gradeLevel: string;
  groupId: string;
};

const emptyFormState: FormState = {
  studentName: "",
  studentPhone: "",
  parentName: "",
  parentPhone: "",
  gradeLevel: "",
  groupId: "",
};

function buildInitialState(student?: EditableStudent): FormState {
  if (!student) {
    return emptyFormState;
  }

  return {
    studentName: student.name,
    studentPhone: student.studentPhone,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    gradeLevel: student.gradeLevel,
    groupId: student.groupId,
  };
}

export function AddStudentForm({ groups, student }: { groups: GroupOption[]; student?: EditableStudent }) {
  const router = useRouter();
  const isEditMode = Boolean(student);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formState, setFormState] = useState<FormState>(buildInitialState(student));

  useEffect(() => {
    if (!open) {
      setFormState(buildInitialState(student));
    }
  }, [open, student]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setOpen(false);
      setSuccessMessage("");
      setErrorMessage("");
      setFormState(buildInitialState(student));
      router.refresh();
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [router, student, successMessage]);

  const availableGroups = useMemo(() => {
    if (!student?.groupId) {
      return groups.filter((group) => !group.isFull);
    }

    return groups.filter((group) => !group.isFull || group.id === student.groupId);
  }, [groups, student?.groupId]);

  const resetForm = () => {
    setOpen(false);
    setErrorMessage("");
    setSuccessMessage("");
    setFormState(buildInitialState(student));
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const formData = new FormData();
      formData.set("studentName", formState.studentName);
      formData.set("studentPhone", formState.studentPhone);
      formData.set("parentName", formState.parentName);
      formData.set("parentPhone", formState.parentPhone);
      formData.set("gradeLevel", formState.gradeLevel);
      formData.set("groupId", formState.groupId);

      const result = isEditMode && student
        ? await (() => {
            formData.set("studentId", student.id);
            return updateStudent(formData);
          })()
        : await createStudent(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? (isEditMode ? "تعذر تحديث بيانات الطالب حاليًا" : "تعذر إضافة الطالب حاليًا"));
        return;
      }

      setSuccessMessage(isEditMode ? "✅ تم تحديث بيانات الطالب بنجاح" : "✅ تم إضافة الطالب بنجاح");
    });
  };

  return (
    <>
      {isEditMode ? (
        <Button 
          className="flex-1 gap-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800" 
          onClick={() => setOpen(true)} 
          type="button" 
          variant="outline"
        >
          <Pencil className="h-4 w-4" />
          تعديل
        </Button>
      ) : (
        <Button className="w-full gap-2 sm:w-auto" onClick={() => setOpen(true)} type="button">
          <Plus className="h-4 w-4" />
          <span>إضافة طالب</span>
        </Button>
      )}

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>{isEditMode ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}</DialogTitle>
                <DialogDescription>
                  {isEditMode ? "حدّث بيانات الطالب وولي الأمر ثم احفظ التعديلات مباشرة." : "أدخل بيانات الطالب وولي الأمر ثم احفظها مباشرة في قاعدة البيانات."}
                </DialogDescription>
              </div>
              <button
                aria-label="إغلاق"
                className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700"
                onClick={resetForm}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <form className="overflow-y-auto px-5 py-5 sm:px-6" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div>
                <Label htmlFor={isEditMode ? `studentName-${student?.id}` : "studentName"}>اسم الطالب</Label>
                <Input
                  id={isEditMode ? `studentName-${student?.id}` : "studentName"}
                  onChange={(event) => handleChange("studentName", event.target.value)}
                  placeholder="أدخل اسم الطالب"
                  value={formState.studentName}
                />
              </div>

              <div>
                <Label htmlFor={isEditMode ? `studentPhone-${student?.id}` : "studentPhone"}>رقم هاتف الطالب</Label>
                <Input
                  dir="ltr"
                  id={isEditMode ? `studentPhone-${student?.id}` : "studentPhone"}
                  inputMode="numeric"
                  maxLength={11}
                  onChange={(event) => handleChange("studentPhone", event.target.value.replace(/\D/g, ""))}
                  placeholder="01XXXXXXXXX"
                  value={formState.studentPhone}
                />
              </div>

              <div>
                <Label htmlFor={isEditMode ? `parentName-${student?.id}` : "parentName"}>اسم ولي الأمر</Label>
                <Input
                  id={isEditMode ? `parentName-${student?.id}` : "parentName"}
                  onChange={(event) => handleChange("parentName", event.target.value)}
                  placeholder="أدخل اسم ولي الأمر"
                  value={formState.parentName}
                />
              </div>

              <div>
                <Label htmlFor={isEditMode ? `parentPhone-${student?.id}` : "parentPhone"}>رقم هاتف ولي الأمر</Label>
                <Input
                  dir="ltr"
                  id={isEditMode ? `parentPhone-${student?.id}` : "parentPhone"}
                  inputMode="numeric"
                  maxLength={11}
                  onChange={(event) => handleChange("parentPhone", event.target.value.replace(/\D/g, ""))}
                  placeholder="01XXXXXXXXX"
                  value={formState.parentPhone}
                />
              </div>

              <div>
                <Label htmlFor={isEditMode ? `gradeLevel-${student?.id}` : "gradeLevel"}>الصف الدراسي</Label>
                <Input
                  id={isEditMode ? `gradeLevel-${student?.id}` : "gradeLevel"}
                  onChange={(event) => handleChange("gradeLevel", event.target.value)}
                  placeholder="مثال: الثالث الثانوي"
                  value={formState.gradeLevel}
                />
              </div>

              <div>
                <Label htmlFor={isEditMode ? `groupId-${student?.id}` : "groupId"}>اختيار المجموعة</Label>
                <select
                  className={cn(
                    "touch-target flex min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-secondary focus:ring-4 focus:ring-secondary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                  )}
                  id={isEditMode ? `groupId-${student?.id}` : "groupId"}
                  onChange={(event) => handleChange("groupId", event.target.value)}
                  value={formState.groupId}
                >
                  <option value="">بدون مجموعة</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} - الأماكن المتاحة: {group.remainingCapacity}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                {successMessage}
              </p>
            ) : null}

            <DialogFooter className="mt-5">
              <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
                {isPending ? (isEditMode ? "جارٍ حفظ التعديلات..." : "جارٍ إضافة الطالب...") : isEditMode ? "حفظ التعديلات" : "إضافة الطالب"}
              </Button>
              <Button className="w-full sm:w-auto" onClick={resetForm} type="button" variant="outline">
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
