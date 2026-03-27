'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import Badge from '@/components/data-display/Badge'
import EmptyState from '@/components/shared/EmptyState'
import { bulkImport } from '@/modules/students/actions'

type AvailableGroup = {
  id: string
  name: string
}

type CSVImporterProps = {
  tenantId: string
  groups: AvailableGroup[]
}

type ImportField =
  | 'name'
  | 'phone'
  | 'parentName'
  | 'parentPhone'
  | 'gradeLevel'
  | 'groupId'

const requiredFields: ImportField[] = [
  'name',
  'phone',
  'parentName',
  'parentPhone',
  'gradeLevel',
]

const fieldLabels: Record<ImportField, string> = {
  name: 'اسم الطالب',
  phone: 'هاتف الطالب',
  parentName: 'اسم ولي الأمر',
  parentPhone: 'هاتف ولي الأمر',
  gradeLevel: 'الصف الدراسي',
  groupId: 'المجموعة',
}

const numberFormatter = new Intl.NumberFormat('ar-EG')

function parseCsvText(text: string) {
  const rows: string[][] = []
  let currentCell = ''
  let currentRow: string[] = []
  let insideQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentCell += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }

      continue
    }

    if (character === ',' && !insideQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !insideQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentCell)
      currentCell = ''

      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow.map((cell) => cell.trim()))
      }

      currentRow = []
      continue
    }

    currentCell += character
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell)

    if (currentRow.some((cell) => cell.trim() !== '')) {
      rows.push(currentRow.map((cell) => cell.trim()))
    }
  }

  return rows
}

function guessFieldForHeader(header: string): ImportField | '' {
  const normalizedHeader = header.trim().toLowerCase()

  if (['name', 'student', 'اسم', 'اسم الطالب'].includes(normalizedHeader)) {
    return 'name'
  }

  if (
    ['phone', 'student phone', 'هاتف الطالب', 'رقم الطالب'].includes(
      normalizedHeader,
    )
  ) {
    return 'phone'
  }

  if (
    ['parent', 'parent name', 'ولي الأمر', 'اسم ولي الأمر'].includes(
      normalizedHeader,
    )
  ) {
    return 'parentName'
  }

  if (
    ['parent phone', 'guardian phone', 'هاتف ولي الأمر', 'رقم ولي الأمر'].includes(
      normalizedHeader,
    )
  ) {
    return 'parentPhone'
  }

  if (
    ['grade', 'grade level', 'الصف', 'الصف الدراسي'].includes(normalizedHeader)
  ) {
    return 'gradeLevel'
  }

  if (
    ['group', 'group id', 'group name', 'المجموعة', 'اسم المجموعة'].includes(
      normalizedHeader,
    )
  ) {
    return 'groupId'
  }

  return ''
}

export default function CSVImporter({ tenantId, groups }: CSVImporterProps) {
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
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950 md:p-8">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">
            رفع ملف CSV
          </h2>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            ارفع ملف الطلاب، راجع المعاينة، ثم حدّد الأعمدة المطابقة قبل بدء الاستيراد.
          </p>
        </div>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-700 dark:hover:bg-sky-950/40">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              void handleFileChange(event.target.files?.[0] ?? null)
            }}
          />

          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            اختر ملف CSV
          </span>
          <span className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {fileName || 'لم يتم اختيار ملف بعد'}
          </span>
        </label>
      </div>

      {headers.length > 0 ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-8">
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
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-8">
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
      ) : (
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
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">
              تم إضافة {numberFormatter.format(result.created)} طالب بنجاح
            </Badge>
            <Badge variant={result.failed > 0 ? 'danger' : 'neutral'}>
              {numberFormatter.format(result.failed)} أخطاء
            </Badge>
          </div>

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
}
