'use client';

import { Pencil, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createStudent, enrollExistingStudent, findStudentByPhone, updateStudent } from "@/modules/students/actions";

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
  groupIds: string[];
};

const emptyFormState: FormState = {
  studentName: "",
  studentPhone: "",
  parentName: "",
  parentPhone: "",
  gradeLevel: "",
  groupIds: [],
};

function buildInitialState(student?: EditableStudent): FormState {
  if (!student) return emptyFormState;
  return {
    studentName: student.name,
    studentPhone: student.studentPhone,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    gradeLevel: student.gradeLevel,
    groupIds: student.groupId ? [student.groupId] : [],
  };
}

export function AddStudentForm({ groups, student }: { groups: GroupOption[]; student?: EditableStudent }) {
  const router = useRouter();
  const isEditMode = Boolean(student);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ─── Phone lookup step (only for new students) ───────────────────────────────
  const [phoneStep, setPhoneStep] = useState<"lookup" | "found" | "new">(isEditMode ? "new" : "lookup");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupPending, startLookupTransition] = useTransition();
  const [foundStudent, setFoundStudent] = useState<{ id: string; name: string; gradeLevel: string | null } | null>(null);
  const [enrollGroupId, setEnrollGroupId] = useState("");

  // ─── Full form state (for new student creation) ───────────────────────────────
  const [formState, setFormState] = useState<FormState>(buildInitialState(student));

  useEffect(() => {
    if (!open) {
      setFormState(buildInitialState(student));
      if (!isEditMode) {
        setPhoneStep("lookup");
        setLookupPhone("");
        setFoundStudent(null);
        setEnrollGroupId("");
      }
      setSuccessMessage("");
      setErrorMessage("");
    }
  }, [open, student, isEditMode]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timeout = window.setTimeout(() => {
      setOpen(false);
      setSuccessMessage("");
      setErrorMessage("");
      router.refresh();
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [router, successMessage]);

  const availableGroups = useMemo(() => {
    if (!student?.groupId) return groups.filter((g) => !g.isFull);
    return groups.filter((g) => !g.isFull || g.id === student.groupId);
  }, [groups, student?.groupId]);

  const resetForm = () => {
    setOpen(false);
    setErrorMessage("");
    setSuccessMessage("");
    setFormState(buildInitialState(student));
    if (!isEditMode) {
      setPhoneStep("lookup");
      setLookupPhone("");
      setFoundStudent(null);
      setEnrollGroupId("");
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleGroupSelection = (groupId: string) => {
    setFormState((current) => {
      const isSelected = current.groupIds.includes(groupId);
      const updated = isSelected
        ? current.groupIds.filter((id) => id !== groupId)
        : [...current.groupIds, groupId];
      
      return { ...current, groupIds: updated };
    });
  };

  const handleSelectAllGroups = () => {
    setFormState((current) => ({
      ...current,
      groupIds: current.groupIds.length === groups.length ? [] : groups.map((g) => g.id),
    }));
  };

  // ─── Phone lookup ─────────────────────────────────────────────────────────────
  const handlePhoneLookup = () => {
    if (!/^01\d{9}$/.test(lookupPhone)) {
      setErrorMessage("يرجى إدخال رقم هاتف مصري صحيح");
      return;
    }
    setErrorMessage("");

    startLookupTransition(async () => {
      const result = await findStudentByPhone(lookupPhone);

      if (result.message) {
        setErrorMessage(result.message);
        return;
      }

      if (result.found && result.student) {
        setFoundStudent(result.student);
        setPhoneStep("found");
      } else {
        // Not found → pre-fill phone and go to full form
        setFormState((prev) => ({ ...prev, studentPhone: lookupPhone }));
        setPhoneStep("new");
      }
    });
  };

  // ─── Enroll existing student ──────────────────────────────────────────────────
  const handleEnrollExisting = () => {
    if (!foundStudent || !enrollGroupId) {
      setErrorMessage("يرجى اختيار مجموعة");
      return;
    }
    setErrorMessage("");
    startTransition(async () => {
      const result = await enrollExistingStudent(foundStudent.id, enrollGroupId);
      if (!result.success) {
        setErrorMessage(result.message ?? "تعذر إضافة الطالب للمجموعة");
        return;
      }
      setSuccessMessage("✅ تم إضافة الطالب للمجموعة بنجاح");
    });
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
      formState.groupIds.forEach((id) => formData.append("groupIds", id));

      const result = isEditMode && student
        ? await (() => { formData.set("studentId", student.id); return updateStudent(formData); })()
        : await createStudent(formData);

      if (!result.success) {
        setErrorMessage(result.message ?? (isEditMode ? "تعذر تحديث بيانات الطالب حاليًا" : "تعذر إضافة الطالب حاليًا"));
        return;
      }

      setSuccessMessage(isEditMode ? "✅ تم تحديث بيانات الطالب بنجاح" : "✅ تم إضافة الطالب بنجاح");
    });
  };

  const selectClassName = cn(
    "touch-target flex min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-secondary focus:ring-4 focus:ring-secondary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
  );

  return (
    <>
      {isEditMode ? (
        <Button className="flex-1 gap-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800" onClick={() => setOpen(true)} type="button" variant="outline">
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
                <DialogTitle>
                  {isEditMode ? "تعديل بيانات الطالب" : phoneStep === "lookup" ? "إضافة طالب" : phoneStep === "found" ? "تأكيد إضافة الطالب" : "بيانات الطالب الجديد"}
                </DialogTitle>
                <DialogDescription>
                  {isEditMode
                    ? "حدّث بيانات الطالب وولي الأمر ثم احفظ التعديلات."
                    : phoneStep === "lookup"
                      ? "أدخل رقم هاتف الطالب أولاً للتحقق من وجود حساب."
                      : phoneStep === "found"
                        ? "تم العثور على حساب مرتبط بهذا الرقم."
                        : "لم يُعثر على حساب — أدخل بيانات الطالب الجديد."}
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

          {/* ── Step 1: Phone lookup ───────────────────────────────────────────── */}
          {!isEditMode && phoneStep === "lookup" && (
            <div className="px-5 py-5 sm:px-6 space-y-4">
              <div>
                <Label htmlFor="lookupPhone">رقم هاتف الطالب</Label>
                <Input
                  dir="ltr"
                  id="lookupPhone"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="01XXXXXXXXX"
                  value={lookupPhone}
                  onChange={(e) => { setLookupPhone(e.target.value.replace(/\D/g, "")); setErrorMessage(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
                />
              </div>

              {errorMessage && (
                <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  {errorMessage}
                </p>
              )}

              <Button className="w-full gap-2" disabled={lookupPending || lookupPhone.length < 11} onClick={handlePhoneLookup} type="button">
                <Search className="h-4 w-4" />
                {lookupPending ? "جارٍ البحث..." : "بحث"}
              </Button>
            </div>
          )}

          {/* ── Step 2a: Found existing student ───────────────────────────────── */}
          {!isEditMode && phoneStep === "found" && foundStudent && (
            <div className="px-5 py-5 sm:px-6 space-y-4">
              <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  رقم الهاتف <span dir="ltr">{lookupPhone}</span> مرتبط بالحساب التالي:
                </p>
                <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{foundStudent.name}</p>
                {foundStudent.gradeLevel && (
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{foundStudent.gradeLevel}</p>
                )}
              </div>

              <div>
                <Label htmlFor="enrollGroup">اختيار المجموعة</Label>
                <select
                  className={selectClassName}
                  id="enrollGroup"
                  value={enrollGroupId}
                  onChange={(e) => { setEnrollGroupId(e.target.value); setErrorMessage(""); }}
                >
                  <option value="">اختر المجموعة</option>
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} - الأماكن المتاحة: {g.remainingCapacity}
                    </option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {successMessage}
                </p>
              )}

              <DialogFooter>
                <Button className="w-full sm:w-auto" disabled={isPending || !enrollGroupId} onClick={handleEnrollExisting} type="button">
                  {isPending ? "جارٍ الإضافة..." : "إضافة الطالب للمجموعة"}
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => { setPhoneStep("lookup"); setFoundStudent(null); setErrorMessage(""); }} type="button" variant="outline">
                  رجوع
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Step 2b: New student form ──────────────────────────────────────── */}
          {(isEditMode || phoneStep === "new") && (
            <form className="overflow-y-auto px-5 py-5 sm:px-6" onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor={isEditMode ? `studentName-${student?.id}` : "studentName"}>اسم الطالب</Label>
                  <Input
                    id={isEditMode ? `studentName-${student?.id}` : "studentName"}
                    onChange={(e) => handleChange("studentName", e.target.value)}
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
                    onChange={(e) => handleChange("studentPhone", e.target.value.replace(/\D/g, ""))}
                    placeholder="01XXXXXXXXX"
                    value={formState.studentPhone}
                  />
                </div>

                <div>
                  <Label htmlFor={isEditMode ? `parentName-${student?.id}` : "parentName"}>اسم ولي الأمر</Label>
                  <Input
                    id={isEditMode ? `parentName-${student?.id}` : "parentName"}
                    onChange={(e) => handleChange("parentName", e.target.value)}
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
                    onChange={(e) => handleChange("parentPhone", e.target.value.replace(/\D/g, ""))}
                    placeholder="01XXXXXXXXX"
                    value={formState.parentPhone}
                  />
                </div>

                <div>
                  <Label htmlFor={isEditMode ? `gradeLevel-${student?.id}` : "gradeLevel"}>الصف الدراسي</Label>
                  <Input
                    id={isEditMode ? `gradeLevel-${student?.id}` : "gradeLevel"}
                    onChange={(e) => handleChange("gradeLevel", e.target.value)}
                    placeholder="مثال: الثالث الثانوي"
                    value={formState.gradeLevel}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>اختيار المجموعات</Label>
                    <button
                      type="button"
                      onClick={handleSelectAllGroups}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {formState.groupIds.length === groups.length ? "إلغاء الكل" : "اختيار كل المجموعات"}
                    </button>
                  </div>
                  
                  <div className="grid gap-2 max-h-[200px] overflow-y-auto p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    {groups.map((group) => (
                      <label 
                        key={group.id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                          formState.groupIds.includes(group.id)
                            ? "bg-primary/10 border-primary dark:bg-sky-400/10 dark:border-sky-400"
                            : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded-md border-slate-300 text-primary focus:ring-primary"
                            checked={formState.groupIds.includes(group.id)}
                            onChange={() => handleGroupSelection(group.id)}
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{group.name}</p>
                            <p className="text-[10px] text-slate-500">الأماكن المتاحة: {group.remainingCapacity}</p>
                          </div>
                        </div>
                        {group.isFull && !formState.groupIds.includes(group.id) && (
                          <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">مكتملة</span>
                        )}
                      </label>
                    ))}
                    {groups.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-400 font-bold">لا توجد مجموعات متاحة حالياً</p>
                    )}
                  </div>
                </div>
              </div>

              {errorMessage && (
                <p className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {successMessage}
                </p>
              )}

              <DialogFooter className="mt-5">
                <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
                  {isPending ? (isEditMode ? "جارٍ حفظ التعديلات..." : "جارٍ إضافة الطالب...") : isEditMode ? "حفظ التعديلات" : "إضافة الطالب"}
                </Button>
                {!isEditMode && (
                  <Button className="w-full sm:w-auto" onClick={() => { setPhoneStep("lookup"); setErrorMessage(""); }} type="button" variant="outline">
                    رجوع
                  </Button>
                )}
                {isEditMode && (
                  <Button className="w-full sm:w-auto" onClick={resetForm} type="button" variant="outline">
                    إلغاء
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
