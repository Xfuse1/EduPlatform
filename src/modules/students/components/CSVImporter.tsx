'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import Badge from '@/components/data-display/Badge'
import EmptyState from '@/components/shared/EmptyState'
import { bulkImport } from '@/modules/students/actions'

import { 
  parseCsvText, 
  guessFieldForHeader, 
  fieldLabels, 
  requiredFields, 
  type ImportField 
} from '../utils/csv'


const numberFormatter = new Intl.NumberFormat('ar-EG')

type AvailableGroup = {
  id: string
  name: string
}

type CSVImporterProps = {
  tenantId: string
  groups: AvailableGroup[]
  hideHeader?: boolean
}


export default function CSVImporter({ tenantId, groups, hideHeader = false }: CSVImporterProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    total: number
    created: number
    failed: number
    results: Array<{ index: number; success: boolean; error?: string }>
  } | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  try {
    async function handleFileChange(file: File | null) {
      setError(null)
      setResult(null)

      if (!file) {
        setFileName('')
        setHeaders([])
        setRows([])
        setMapping({})
        return
      }

      const text = await file.text()
      const parsedRows = parseCsvText(text)

      if (parsedRows.length < 2) {
        setError('الملف لا يحتوي على صفوف بيانات كافية')
        return
      }

      const [headerRow, ...dataRows] = parsedRows
      const normalizedHeaders = headerRow.map((header, index) =>
        header || `column_${index + 1}`,
      )

      setFileName(file.name)
      setHeaders(normalizedHeaders)
      setRows(
        dataRows.map((row) =>
          Object.fromEntries(
            normalizedHeaders.map((header, index) => [header, row[index] ?? '']),
          ),
        ),
      )
      setMapping(
        Object.fromEntries(
          normalizedHeaders
            .map((header) => [guessFieldForHeader(header), header] as const)
            .filter((entry): entry is [ImportField, string] => Boolean(entry[0])),
        ),
      )
    }

    function handleImport() {
      setError(null)

      const missingRequiredField = requiredFields.find((field) => !mapping[field])

      if (missingRequiredField) {
        setError(`يرجى تحديد عمود لحقل ${fieldLabels[missingRequiredField]}`)
        return
      }

      startTransition(() => {
        void (async () => {
          try {
            const records = rows.map((row) => {
              const groupValue = mapping.groupId ? row[mapping.groupId] ?? '' : ''
              const matchingGroup = groups.find(
                (group) =>
                  group.id === groupValue ||
                  group.name.trim().toLowerCase() === groupValue.trim().toLowerCase(),
              )

              return {
                name: mapping.name ? row[mapping.name] ?? '' : '',
                phone: mapping.phone ? row[mapping.phone] ?? '' : '',
                parentName: mapping.parentName ? row[mapping.parentName] ?? '' : '',
                parentPhone: mapping.parentPhone ? row[mapping.parentPhone] ?? '' : '',
                gradeLevel: mapping.gradeLevel ? row[mapping.gradeLevel] ?? '' : '',
                groupId: matchingGroup?.id ?? groupValue,
              }
            })

            const importResult = await bulkImport(tenantId, records)
            setResult(importResult)
            router.refresh()
          } catch (importError) {
            setError(
              importError instanceof Error
                ? importError.message
                : 'تعذر تنفيذ الاستيراد الآن',
            )
          }
        })()
      })
    }

    return (
      <div className="space-y-6">
        {!hideHeader && (
          <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/50 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                  رفع ملف CSV
                </h2>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  ارفع ملف الطلاب، راجع المعاينة، ثم حدّد الأعمدة المطابقة قبل بدء الاستيراد.
                </p>
              </div>
              
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#00B8A0] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#00a090]">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    void handleFileChange(event.target.files?.[0] ?? null)
                  }}
                />
                <span>اختر الملف</span>
              </label>
            </div>

            {fileName && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100/50 px-4 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
                <span className="font-bold">الملف الحالي:</span>
                <span>{fileName}</span>
              </div>
            )}
          </div>
        )}

        {hideHeader && !fileName && (
          <label className="flex h-full min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#00B8A0]/30 bg-white/5 transition hover:border-[#00B8A0] hover:bg-[#00B8A0]/5">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                void handleFileChange(event.target.files?.[0] ?? null)
              }}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00B8A0]/20 text-[#00B8A0]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="mt-4 text-sm font-bold text-slate-900 dark:text-white">اضغط لرفع ملف الطلاب (CSV)</span>
            <span className="mt-2 text-xs text-slate-500">سنتولى نحن عملية الربط الذكي</span>
          </label>
        )}

        {hideHeader && fileName && !headers.length && (
           <div className="flex items-center justify-between rounded-[22px] border border-[#00B8A0]/30 bg-white/5 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00B8A0]/20 text-[#00B8A0]">
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-white">{fileName}</p>
                  <p className="text-xs text-slate-400">تم اختيار الملف بنجاح</p>
                </div>
              </div>
              <button 
                onClick={() => handleFileChange(null)}
                className="text-sm font-bold text-rose-400 hover:text-rose-300"
              >
                إلغاء
              </button>
           </div>
        )}

        {headers.length > 0 ? (
          <section className="rounded-[22px] border border-slate-200 bg-white/50 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              ربط الأعمدة
            </h3>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {(Object.keys(fieldLabels) as ImportField[]).map((field) => (
                <label key={field} className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {fieldLabels[field]}
                    {requiredFields.includes(field) ? ' *' : ''}
                  </span>
                  <select
                    value={mapping[field] ?? ''}
                    onChange={(event) =>
                      setMapping((currentValue) => ({
                        ...currentValue,
                        [field]: event.target.value || undefined,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
                  >
                    <option value="">غير مرتبط</option>
                    {headers.map((header) => (
                      <option key={`${field}-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {rows.length > 0 ? (
          <section className="rounded-[22px] border border-slate-200 bg-white/50 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  معاينة البيانات
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  يتم عرض أول {numberFormatter.format(Math.min(rows.length, 5))} صفوف
                </p>
              </div>

              <button
                type="button"
                onClick={handleImport}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
              >
                {isPending ? 'جارٍ تنفيذ الاستيراد...' : 'بدء الاستيراد'}
              </button>
            </div>

            <div className="mt-5 overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {rows.slice(0, 5).map((row, index) => (
                    <tr key={`preview-row-${index}`}>
                      {headers.map((header) => (
                        <td
                          key={`${index}-${header}`}
                          className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
                        >
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {!hideHeader && !rows.length && (
          <EmptyState
            title="لا توجد معاينة بعد"
            message="ارفع ملف CSV لعرض الصفوف وربط الأعمدة قبل بدء الاستيراد."
          />
        )}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {result ? (
          <section className="rounded-[22px] border border-slate-200 bg-white/50 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">
                تم إضافة {numberFormatter.format(result.created)} طالب بنجاح
              </Badge>
              <Badge variant={result.failed > 0 ? 'danger' : 'neutral'}>
                {numberFormatter.format(result.failed)} أخطاء
              </Badge>
            </div>

            {result.created > 0 && (
              <div className="mt-5 space-y-3">
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  أرسل لينك التسجيل لأولياء الأمور:
                </p>
                {rows
                  .filter((_, index) => result.results[index]?.success)
                  .map((row, index) => {
                    const parentPhone = mapping.parentPhone 
                      ? row[mapping.parentPhone]?.replace(/^0/, '20') 
                      : null
                    const studentPhone = mapping.phone 
                      ? row[mapping.phone]?.replace(/^0/, '20') 
                      : null
                    const studentName = mapping.name 
                      ? row[mapping.name] 
                      : `الطالب ${index + 1}`

                    if (!parentPhone && !studentPhone) return null

                    return (
                      <div
                        key={`whatsapp-row-${index}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                      >
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {studentName}
                        </span>
                        <div className="flex items-center gap-2">
                          {parentPhone && (
                            <a
                              href={`https://wa.me/${parentPhone}?text=${encodeURIComponent(
                                `مرحباً، تم تسجيل ${studentName} في المنصة. سجّل حسابك كولي أمر من هنا: ${origin}/parent-register?phone=${row[mapping.parentPhone ?? ''] ?? ''}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                            >
                              📱 ولي الأمر
                            </a>
                          )}
                          {studentPhone && (
                            <a
                              href={`https://wa.me/${studentPhone}?text=${encodeURIComponent(
                                `مرحباً ${studentName}، تم تسجيلك في المنصة. سجّل حسابك من هنا: ${origin}/register?phone=${row[mapping.phone ?? ''] ?? ''}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                            >
                              📱 الطالب
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            {result.results.some((item) => !item.success) ? (
              <div className="mt-5 space-y-3">
                {result.results
                  .filter((item) => !item.success)
                  .map((item) => (
                    <div
                      key={`import-error-${item.index}`}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                    >
                      الصف {numberFormatter.format(item.index + 2)}: {item.error}
                    </div>
                  ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    )
  } catch (err) {
    console.error('CSVImporter error:', err)
    return (
      <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
        <p className="font-bold">حدث خطأ، يرجى المحاولة مرة أخرى</p>
      </div>
    )
  }
}
