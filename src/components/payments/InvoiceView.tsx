"use client"

import React from "react"
import { Printer, Download, CheckCircle2, CreditCard, Calendar, User, Hash, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { showToast } from "@/components/ui/Toast"
import { toArabicDigits, formatCurrency } from "@/lib/utils"

// --- Types ---

interface InvoiceItem {
  id: string
  sessionName: string
  date: string
  price: number
}

interface InvoiceData {
  centerName: string
  studentName: string
  invoiceNumber: string
  invoiceDate: string
  items: InvoiceItem[]
  total: number
}

// --- Mock Data ---

const MOCK_INVOICE: InvoiceData = {
  centerName: "سنتر التفوق التعليمي",
  studentName: "أحمد بن محمد",
  invoiceNumber: "INV-2026-0042",
  invoiceDate: "2026-03-25",
  items: [
    { id: "i1", sessionName: "حصة الرياضيات 1", date: "2026-03-01", price: 150 },
    { id: "i2", sessionName: "حصة الرياضيات 2", date: "2026-03-08", price: 150 },
    { id: "i3", sessionName: "حصة الفيزياء 1", date: "2026-03-05", price: 120 },
    { id: "i4", sessionName: "حصة الفيزياء 2", date: "2026-03-12", price: 120 },
    { id: "i5", sessionName: "حصة الكيمياء 1", date: "2026-03-15", price: 130 },
    { id: "i6", sessionName: "حصة الكيمياء 2", date: "2026-03-22", price: 130 },
  ],
  total: 800,
}

export function InvoiceView({ invoice = MOCK_INVOICE }: { invoice?: InvoiceData }) {
  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // TODO: implement PDF generation with @react-pdf/renderer
    showToast.info("ميزة تحميل PDF قيد التطوير حالياً وسيتم تفعيلها قريباً.")
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Action Buttons (Hidden on Print) */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border rounded-2xl p-4 print:hidden">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">فاتورة مدفوعة رقم {invoice.invoiceNumber}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 h-10 px-4 rounded-xl text-xs" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            طباعة الفاتورة
          </Button>
          <Button variant="default" className="gap-2 h-10 px-4 rounded-xl text-xs" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" />
            تحميل PDF
          </Button>
        </div>
      </div>

      {/* Invoice Content (A4 Style) */}
      <Card className="border shadow-xl rounded-[32px] overflow-hidden bg-white dark:bg-slate-950 p-8 sm:p-12 print:border-none print:shadow-none print:p-0">
        <CardContent className="p-0 space-y-10">
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
            <div className="space-y-4">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <div className="h-10 w-10 border-4 border-primary rounded-lg border-t-transparent animate-spin-slow rotate-45" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{invoice.centerName}</h2>
                <p className="text-sm text-slate-400 mt-1">إدارة مراكز الدروس الخصوصية المعتمدة</p>
              </div>
            </div>
            
            <div className="text-right space-y-2">
              <div className="inline-flex rounded-full bg-primary/5 px-4 py-1 text-primary text-xs font-black uppercase tracking-widest">فاتورة ضريبية مبسطة</div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mt-4">فاتورة</h1>
              <p className="text-sm text-slate-500 font-bold flex items-center justify-end gap-2">
                <Hash className="h-4 w-4" /> {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          {/* Info Section */}
          <div className="grid sm:grid-cols-2 gap-8 border-y border-dashed py-8">
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">محررة إلى:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-primary" />
                  <p className="text-base font-black text-slate-800 dark:text-slate-100">{invoice.studentName}</p>
                </div>
                <div className="flex items-center gap-3 opacity-60">
                  <span className="text-xs font-bold text-slate-500 pr-7">الرقم التعريفي: {toArabicDigits('120485')}</span>
                </div>
              </div>
            </div>
            
            <div className="sm:text-left space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">تفاصيل التاريخ:</p>
              <div className="flex items-center justify-end gap-3">
                <p className="text-base font-black text-slate-800 dark:text-slate-100">{toArabicDigits(invoice.invoiceDate)}</p>
                <Calendar className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">تفاصيل الحصص والجلسات:</p>
            <div className="overflow-hidden rounded-2xl border">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900">
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b">الجلسة / المادة</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b text-center">التاريخ</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b text-left">السعر</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-800 dark:text-slate-200">{item.sessionName}</td>
                      <td className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 text-center">{toArabicDigits(item.date)}</td>
                      <td className="p-4 text-sm font-black text-slate-900 dark:text-white text-left">{formatCurrency(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-6">
            <div className="space-y-4 max-w-sm">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 text-primary border border-primary/10">
                <Info className="h-5 w-5 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed font-bold">هذه الفاتورة مستخرجة إلكترونياً من نظام EduPlatform ولا تحتاج إلى توقيع أو ختم رسمي.</p>
              </div>
            </div>
            
            <div className="w-full sm:w-64 space-y-3">
              <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                <span>المجموع الفرعي:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                <span>ضريبة القيمة المضافة (0%):</span>
                <span>٠ جنيه</span>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
              <div className="flex justify-between items-center text-xl font-black text-primary">
                <span>الإجمالي النهائي:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Final Message */}
          <div className="pt-12 text-center">
            <p className="text-xl font-black text-slate-300 dark:text-slate-800 select-none">شـكراً لثقتكم بالسنـتر</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
