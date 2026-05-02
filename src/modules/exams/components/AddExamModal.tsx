'use client';

import { Calendar, Save, Trash2, PlusCircle, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Badge } from "@/components/ui/badge";

interface Group {
  id: string;
  name: string;
}

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onAdd: (exam: any) => void;
  examToEdit?: any;
}

export function AddExamModal({ isOpen, onClose, groups, onAdd, examToEdit }: AddExamModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    groupId: groups[0]?.id || "",
    examDate: "",
    durationMinutes: "60",
    maxScore: "100",
  });

  const [questions, setQuestions] = useState<any[]>([]);

  // Reset form when modal opens or examToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (examToEdit) {
        setFormData({
            title: examToEdit.title,
            description: examToEdit.description || "",
            groupId: examToEdit.groupId,
            examDate: (() => {
              const d = new Date(examToEdit.startAt);
              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
              return d.toISOString().slice(0, 16);
            })(),
            durationMinutes: String(examToEdit.duration),
            maxScore: String(examToEdit.maxGrade),
        });
        setQuestions(examToEdit.questions || []);
      } else {
        setFormData({ title: "", description: "", groupId: groups[0]?.id || "", examDate: "", durationMinutes: "60", maxScore: "100" });
        setQuestions([]);
      }
    }
  }, [isOpen, examToEdit, groups]);

  const addQuestion = () => setQuestions(prev => [...prev, {
    type: 'MCQ',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    grade: 10
  }]);

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? {...q, [field]: value} : q));
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const options = [...q.options];
      options[optIndex] = value;
      return {...q, options};
    }));
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const body = {
        title: formData.title,
        description: formData.description,
        groupId: formData.groupId,
        startAt: new Date(formData.examDate).toISOString(),
        duration: parseInt(formData.durationMinutes),
        maxGrade: parseInt(formData.maxScore),
        questions: questions.map(q => ({
          ...q,
          correctAnswer: q.correctAnswer
        }))
      };

      const url = examToEdit ? `/api/exams/${examToEdit.id}` : '/api/exams';
      const method = examToEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to save exam');

      const data = await response.json();
      
      // Map to the format expected by the parent listing
      const result = {
        ...data,
        group: { name: groups.find(g => g.id === data.groupId)?.name || "بدون مجموعة" },
        examDate: data.startAt,
        durationMinutes: data.duration,
        maxScore: data.maxGrade,
        status: (() => {
          const now = new Date();
          const start = new Date(data.startAt);
          const end = new Date(start.getTime() + data.duration * 60000);
          if (now > end) return "completed";
          if (now >= start) return "active";
          return "upcoming";
        })(),
        _count: { submissions: examToEdit ? examToEdit._count.submissions : 0 },
        questions: data.questions || []
      };

      onAdd(result);
      onClose();
    } catch (error) {
      console.error("Failed to add exam:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(760px,calc(100vw-2rem))] max-h-[92vh] overflow-hidden border-slate-200 bg-white p-0 shadow-[0_30px_90px_rgba(2,8,23,0.38)] dark:border-slate-800 dark:bg-slate-950" dir="rtl">
        <DialogHeader className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/35">
          <DialogTitle className="text-center text-2xl font-extrabold text-slate-950 dark:text-white">
            {examToEdit ? "تعديل الامتحان" : "إضافة امتحان جديد"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title" className="text-sm font-bold text-slate-700 dark:text-slate-200">عنوان الامتحان</Label>
              <Input
                id="title"
                placeholder="مثال: امتحان الشهر الأول - فيزياء"
                required
                className="min-h-12 rounded-xl bg-white text-sm font-medium shadow-none dark:bg-slate-950"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupId" className="text-sm font-bold text-slate-700 dark:text-slate-200">المجموعة المختبرة</Label>
              <select
                aria-label="المجموعة المختبرة"
                id="groupId"
                name="groupId"
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
              <Label htmlFor="examDate" className="text-sm font-bold text-slate-700 dark:text-slate-200">تاريخ ووقت الامتحان</Label>
              <div className="relative">
                  <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="examDate"
                    type="datetime-local"
                    required
                    className="block min-h-12 w-full cursor-pointer rounded-xl bg-white ps-10 text-sm font-medium dark:bg-slate-950"
                    value={formData.examDate}
                    onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    onClick={(e) => e.currentTarget.showPicker?.()}
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
                className="min-h-12 rounded-xl bg-white text-center text-sm font-bold dark:bg-slate-950"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxScore" className="text-sm font-bold text-slate-700 dark:text-slate-200">الدرجة النهائية</Label>
              <Input
                id="maxScore"
                type="number"
                min="1"
                required
                placeholder="مثال: 100"
                className="min-h-12 rounded-xl bg-white text-center text-sm font-bold dark:bg-slate-950"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
              />
            </div>
          </div>

          {/* قسم الأسئلة */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">أسئلة الامتحان</h3>
              </div>
              <Button type="button" onClick={addQuestion} variant="outline" className="min-h-10 rounded-xl px-4 shadow-sm">
                <PlusCircle className="me-1.5 h-4 w-4" />
                إضافة سؤال
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/55 dark:hover:border-slate-700">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                       <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-lg px-2.5 py-1">
                        سؤال {index + 1}
                       </Badge>
                       <select
                        aria-label={`نوع السؤال ${index + 1}`}
                        name={`question-type-${index}`}
                        value={q.type}
                        onChange={e => updateQuestion(index, 'type', e.target.value)}
                        className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/15 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="MCQ">اختيار متعدد (MCQ)</option>
                        <option value="ESSAY">سؤال مقالي (Essay)</option>
                        <option value="TRUE_FALSE">صح وخطأ</option>
                      </select>
                    </div>

                    <Textarea
                      aria-label={`نص السؤال ${index + 1}`}
                      value={q.questionText}
                      onChange={e => updateQuestion(index, 'questionText', e.target.value)}
                      placeholder="اكتب نص السؤال هنا..."
                      className="min-h-[92px] w-full resize-none rounded-xl bg-white text-sm font-medium dark:bg-slate-900"
                    />

                    {q.type === 'MCQ' && (
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-slate-500 mb-1">الخيارات (حدد الإجابة الصحيحة):</Label>
                        {q.options.map((opt: string, i: number) => (
                          <div key={i} className="flex gap-3 items-center group/opt">
                            <input
                              aria-label={`تحديد الخيار ${i + 1} كإجابة صحيحة للسؤال ${index + 1}`}
                              type="radio"
                              name={`correct-${index}`}
                              checked={q.correctAnswer === opt && opt !== ''}
                              onChange={() => updateQuestion(index, 'correctAnswer', opt)}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                            <Input
                              aria-label={`الخيار ${i + 1} للسؤال ${index + 1}`}
                              value={opt}
                              onChange={e => updateOption(index, i, e.target.value)}
                              placeholder={`الخيار ${i + 1}`}
                              className="h-11 flex-1 rounded-xl bg-white text-sm dark:bg-slate-900"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'ESSAY' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">نموذج الإجابة (يستخدمه الـ AI للتقييم):</Label>
                        <Textarea
                          aria-label={`نموذج إجابة السؤال ${index + 1}`}
                          value={q.correctAnswer}
                          onChange={e => updateQuestion(index, 'correctAnswer', e.target.value)}
                          placeholder="اكتب نموذج الإجابة هنا لمساعدة الـ AI في تصحيح إجابات الطلاب..."
                          className="w-full rounded-xl border-dashed text-sm italic"
                        />
                      </div>
                    )}

                    {q.type === 'TRUE_FALSE' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">الإجابة الصحيحة:</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`tf-${index}`}
                              checked={q.correctAnswer === 'true'}
                              onChange={() => updateQuestion(index, 'correctAnswer', 'true')}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm font-bold text-emerald-600">✓ صح</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`tf-${index}`}
                              checked={q.correctAnswer === 'false'}
                              onChange={() => updateQuestion(index, 'correctAnswer', 'false')}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm font-bold text-red-500">✗ خطأ</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Label className="text-xs font-bold text-slate-500">الدرجة:</Label>
                      <Input
                        aria-label={`درجة السؤال ${index + 1}`}
                        type="number"
                        value={q.grade}
                        onChange={e => updateQuestion(index, 'grade', Number(e.target.value))}
                        className="h-10 w-24 rounded-xl border-slate-200 bg-white text-center text-sm font-bold dark:bg-slate-900"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => removeQuestion(index)}
                      className="min-h-10 rounded-xl px-3 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10"
                    >
                      <Trash2 className="h-4 w-4 me-1.5" />
                      حذف السؤال
                    </Button>
                  </div>
                </div>
              ))}

              {questions.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-12 text-center dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-900">
                    <PlusCircle className="h-6 w-6 text-slate-300" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">لا توجد أسئلة بعد</h4>
                  <p className="text-xs text-slate-400 mt-1">ابدأ بإضافة أول سؤال للامتحان</p>
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="grid gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:grid-cols-2">
            <Button type="button" variant="outline" className="min-h-12 border-slate-200 font-bold dark:border-slate-700" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="min-h-12 font-bold shadow-md" disabled={loading || questions.length === 0}>
              {loading ? "جاري الحفظ..." : (
                  <>
                    <Save className="me-2 h-5 w-5" />
                    {examToEdit ? "حفظ التعديلات" : `حفظ الامتحان (${questions.length} سؤال)`}
                  </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
