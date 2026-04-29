'use client';

import { ArrowUpLeft, FileText, Pencil, Plus, Repeat, Search, Wallet, X } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { InvoiceView } from "@/components/payments/InvoiceView";

type PaymentStatus = "PAID" | "OVERDUE" | "PENDING";
type PaymentFilter = PaymentStatus | "ALL";

type PaymentItem = {
  id: string;
  studentName: string;
  month: string;
  status: PaymentStatus;
  amount: number;
};

const paymentStatuses: Array<{ value: PaymentStatus; label: string }> = [
  { value: "PAID", label: "مدفوع" },
  { value: "OVERDUE", label: "متأخر" },
  { value: "PENDING", label: "معلق" },
];

const paymentFilters: Array<{ value: PaymentFilter; label: string }> = [
  { value: "ALL", label: "الكل" },
  { value: "OVERDUE", label: "المتأخر" },
  { value: "PAID", label: "المدفوع" },
  { value: "PENDING", label: "المعلق" },
];

function statusLabel(status: PaymentStatus) {
  if (status === "PAID") return "مدفوع";
  if (status === "OVERDUE") return "متأخر";
  return "معلق";
}

function statusClass(status: PaymentStatus) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (status === "OVERDUE") return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
}

export function PaymentsPageClient({
  initialPayments,
  initialStudentQuery = "",
  initialStatus = "ALL",
}: {
  initialPayments: PaymentItem[];
  initialStudentQuery?: string;
  initialStatus?: PaymentFilter;
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [isOpen, setIsOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("PAID");
  const [query, setQuery] = useState(initialStudentQuery);
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>(initialStatus);

  const totalCollected = useMemo(
    () => payments.filter((payment) => payment.status === "PAID").reduce((sum, item) => sum + item.amount, 0),
    [payments],
  );
  const totalOverdue = useMemo(
    () => payments.filter((payment) => payment.status === "OVERDUE").reduce((sum, item) => sum + item.amount, 0),
    [payments],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const matchesFilter = activeFilter === "ALL" ? true : payment.status === activeFilter;
        const matchesQuery =
          normalizedQuery.length === 0
            ? true
            : payment.studentName.toLowerCase().includes(normalizedQuery) || payment.month.toLowerCase().includes(normalizedQuery);

        return matchesFilter && matchesQuery;
      }),
    [activeFilter, normalizedQuery, payments],
  );

  const resetForm = () => {
    setStudentName("");
    setMonth("");
    setAmount("");
    setStatus("PAID");
    setEditingPaymentId(null);
    setIsOpen(false);
  };

  const openCreateDialog = () => {
    setStudentName("");
    setMonth("");
    setAmount("");
    setStatus("PAID");
    setEditingPaymentId(null);
    setIsOpen(true);
  };

  const openEditDialog = (payment: PaymentItem) => {
    setStudentName(payment.studentName);
    setMonth(payment.month);
    setAmount(String(payment.amount));
    setStatus(payment.status);
    setEditingPaymentId(payment.id);
    setIsOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!studentName.trim() || !month.trim() || !amount.trim()) {
      return;
    }

    if (editingPaymentId) {
      setPayments((current) =>
        current.map((payment) =>
          payment.id === editingPaymentId
            ? {
                ...payment,
                studentName: studentName.trim(),
                month: month.trim(),
                amount: Number(amount),
                status,
              }
            : payment,
        ),
      );
      resetForm();
      return;
    }

    setPayments((current) => [
      {
        id: `payment-${current.length + 1}`,
        studentName: studentName.trim(),
        month: month.trim(),
        status,
        amount: Number(amount),
      },
      ...current,
    ]);

    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-start text-3xl font-extrabold text-slate-900 dark:text-white">المصاريف</h1>
          <p className="mt-2 text-start text-sm text-slate-600 dark:text-slate-300">ملخص واضح للتحصيل والمديونيات مع إبراز المبلغ والحالة.</p>
        </div>
        <Button className="hidden gap-2 sm:inline-flex" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          تسجيل دفعة جديدة
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link
          className="group rounded-[18px] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          href="/payments/wallet"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-sky-400/20 dark:text-sky-300">
              <Wallet className="h-5 w-5" />
            </span>
            <ArrowUpLeft className="h-4 w-4 text-slate-400 transition group-hover:text-primary" />
          </div>
          <p className="mt-3 text-start text-base font-bold text-slate-900 dark:text-white">المحفظة</p>
          <p className="mt-1 text-start text-sm text-slate-500 dark:text-slate-400">عرض الرصيد والشحن عبر كاشير.</p>
        </Link>

        <Link
          className="group rounded-[18px] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          href="/payments/subscription"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-sky-400/20 dark:text-sky-300">
              <FileText className="h-5 w-5" />
            </span>
            <ArrowUpLeft className="h-4 w-4 text-slate-400 transition group-hover:text-primary" />
          </div>
          <p className="mt-3 text-start text-base font-bold text-slate-900 dark:text-white">الاشتراك</p>
          <p className="mt-1 text-start text-sm text-slate-500 dark:text-slate-400">إدارة خطة الاشتراك والفوترة.</p>
        </Link>

        <Link
          className="group rounded-[18px] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          href="/payments/wallet"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-sky-400/20 dark:text-sky-300">
              <Repeat className="h-5 w-5" />
            </span>
            <ArrowUpLeft className="h-4 w-4 text-slate-400 transition group-hover:text-primary" />
          </div>
          <p className="mt-3 text-start text-base font-bold text-slate-900 dark:text-white">السحب</p>
          <p className="mt-1 text-start text-sm text-slate-500 dark:text-slate-400">سحب رصيد المعلم أو التواصل مع الإدارة.</p>
        </Link>
      </div>

      {initialStudentQuery ? (
        <div className="rounded-[20px] border border-primary/20 bg-primary/5 p-4 dark:border-sky-400/20 dark:bg-sky-400/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-start text-sm font-bold text-primary dark:text-sky-300">تم فتح صفحة التحصيل لهذا التنبيه</p>
              <p className="mt-1 text-start text-sm text-slate-600 dark:text-slate-300">
                نعرض الآن بيانات الطالب <span className="font-bold text-slate-900 dark:text-white">{initialStudentQuery}</span> لتسهيل المتابعة السريعة.
              </p>
            </div>
            <Button
              className="shrink-0"
              onClick={() => {
                setQuery("");
                setActiveFilter("ALL");
              }}
              type="button"
              variant="outline"
            >
              عرض الكل
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-[linear-gradient(135deg,_#1A5276,_#2E86C1)] text-white">
          <CardContent className="p-6">
            <p className="text-start text-sm text-white/75">إجمالي المحصل</p>
            <p className="mt-3 text-start text-3xl font-extrabold">{formatCurrency(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[linear-gradient(135deg,_#F39C12,_#E74C3C)] text-white">
          <CardContent className="p-6">
            <p className="text-start text-sm text-white/75">إجمالي المتأخر</p>
            <p className="mt-3 text-start text-3xl font-extrabold">{formatCurrency(totalOverdue)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-[20px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 end-4 my-auto h-4 w-4 text-slate-400" />
            <Input className="pe-10" onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الطالب أو الشهر" value={query} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {paymentFilters.map((item) => (
              <button
                key={item.value}
                className={`touch-target rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  activeFilter === item.value
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
                onClick={() => setActiveFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">لا توجد نتائج مطابقة</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">جرّب تغيير البحث أو الفلتر للوصول إلى سجل تحصيل آخر.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPayments.map((payment) => (
            <Card
              key={payment.id}
              className={
                normalizedQuery.length > 0 && payment.studentName.toLowerCase().includes(normalizedQuery)
                  ? "border-primary shadow-[0_12px_30px_rgba(26,82,118,0.18)] dark:border-sky-400"
                  : undefined
              }
            >
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-start text-lg font-bold text-slate-900 dark:text-white">{payment.studentName}</h2>
                    <p className="mt-1 text-start text-sm text-slate-500 dark:text-slate-400">{payment.month}</p>
                  </div>
                  <span className={`rounded-full px-3 py-2 text-xs font-bold ${statusClass(payment.status)}`}>{statusLabel(payment.status)}</span>
                </div>

                <p className="text-start text-3xl font-extrabold text-primary dark:text-sky-300">{formatCurrency(payment.amount)}</p>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={() => openEditDialog(payment)} type="button" variant="outline">
                    <Pencil className="h-4 w-4" />
                    تعديل
                  </Button>
                  <Button 
                    className="flex-1 gap-2 border-primary/20 text-primary hover:bg-primary/5" 
                    onClick={() => setIsInvoiceOpen(true)} 
                    type="button" 
                    variant="outline"
                  >
                    <FileText className="h-4 w-4" />
                    الفاتورة
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button className="w-full gap-2 sm:hidden" onClick={openCreateDialog}>
        <Plus className="h-4 w-4" />
        تسجيل دفعة جديدة
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)] dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-start text-xl font-extrabold text-slate-900 dark:text-white">
                  {editingPaymentId ? "تعديل الدفعة" : "تسجيل دفعة جديدة"}
                </h2>
                <p className="mt-1 text-start text-sm text-slate-500 dark:text-slate-400">
                  {editingPaymentId ? "حدّث بيانات الدفعة وسيتم تعديل البطاقة مباشرة." : "أضف دفعة وسيتم تحديث القائمة مباشرة."}
                </p>
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

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-start text-sm font-semibold text-slate-700 dark:text-slate-200">اسم الطالب</label>
                <Input onChange={(event) => setStudentName(event.target.value)} placeholder="اكتب اسم الطالب" value={studentName} />
              </div>
              <div>
                <label className="mb-2 block text-start text-sm font-semibold text-slate-700 dark:text-slate-200">الشهر</label>
                <Input onChange={(event) => setMonth(event.target.value)} placeholder="مثال: أبريل ٢٠٢٦" value={month} />
              </div>
              <div>
                <label className="mb-2 block text-start text-sm font-semibold text-slate-700 dark:text-slate-200">حالة الدفعة</label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentStatuses.map((item) => (
                    <button
                      key={item.value}
                      className={`touch-target rounded-xl border px-3 py-3 text-sm font-bold transition ${
                        status === item.value
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      }`}
                      onClick={() => setStatus(item.value)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-start text-sm font-semibold text-slate-700 dark:text-slate-200">المبلغ</label>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                  placeholder="450"
                  value={amount}
                />
              </div>
              <div className="flex gap-3">
                <Button className="w-full" type="submit">
                  {editingPaymentId ? "حفظ التعديلات" : "حفظ الدفعة"}
                </Button>
                <Button className="w-full" onClick={resetForm} type="button" variant="outline">
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-slate-50 dark:bg-slate-900 shadow-2xl relative">
            <button 
              className="absolute top-6 left-6 z-10 h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              onClick={() => setIsInvoiceOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-4 sm:p-10 pb-20">
              <InvoiceView />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
