'use client'

import Link from 'next/link'
import { useDeferredValue, useState } from 'react'

import Badge from '@/components/data-display/Badge'
import DataTable from '@/components/data-display/DataTable'
import EmptyState from '@/components/shared/EmptyState'
import SearchBar from '@/components/shared/SearchBar'

import StudentCard from './StudentCard'
import StudentForm from './StudentForm'

type StudentListItem = {
  id: string
  name: string
  gradeLevel: string | null
  parentPhone: string | null
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
  groups: Array<{
    id: string
    name: string
    subject: string
    color: string
  }>
}

type AvailableGroup = {
  id: string
  name: string
  subject: string
  gradeLevel: string
  studentCount: number
  maxCapacity: number
}

type StudentListProps = {
  students: StudentListItem[]
  groups: AvailableGroup[]
}

const paymentStatusLabels = {
  PAID: 'مدفوع',
  PARTIAL: 'مدفوع جزئيًا',
  PENDING: 'مستحق',
  OVERDUE: 'متأخر',
} as const

const paymentStatusVariants = {
  PAID: 'success',
  PARTIAL: 'warning',
  PENDING: 'info',
  OVERDUE: 'danger',
} as const

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function StudentList({ students, groups }: StudentListProps) {
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const deferredSearch = useDeferredValue(search)

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      deferredSearch.trim() === '' ||
      student.name.toLowerCase().includes(deferredSearch.trim().toLowerCase())

    const matchesGroup =
      !groupFilter || student.groups.some((group) => group.id === groupFilter)

    const matchesPayment =
      !paymentFilter || student.paymentStatus === paymentFilter

    return matchesSearch && matchesGroup && matchesPayment
  })

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] bg-gradient-to-l from-sky-800 via-sky-700 to-cyan-600 px-5 py-6 text-white shadow-lg md:flex-row md:items-center md:justify-between md:px-8">
        <div className="space-y-2">
          <p className="text-sm text-sky-100">إدارة بيانات الطلاب</p>
          <h1 className="text-2xl font-bold md:text-3xl">قائمة الطلاب</h1>
          <p className="max-w-2xl text-sm leading-6 text-sky-50/90">
            ابحث بسرعة، راجع حالة المصاريف، وانتقل إلى الملف الكامل لكل طالب.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/teacher/students/import"
            className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            استيراد CSV
          </Link>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-50"
          >
            إضافة طالب
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="ابحث باسم الطالب"
          />

          <select
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
          >
            <option value="">كل المجموعات</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
          >
            <option value="">كل حالات الدفع</option>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <EmptyState
          title="لا توجد نتائج مطابقة"
          message="غيّر معايير البحث أو أضف طالبًا جديدًا ليظهر هنا."
          action={
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:text-slate-950 dark:hover:bg-sky-500"
            >
              إضافة طالب
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {filteredStudents.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={filteredStudents}
              rowKey={(student) => student.id}
              columns={[
                {
                  key: 'name',
                  header: 'الطالب',
                  render: (student) => (
                    <div>
                      <Link
                        href={`/teacher/students/${student.id}`}
                        className="font-semibold text-slate-950 transition-colors hover:text-sky-800 dark:text-white dark:hover:text-sky-300"
                      >
                        {student.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {student.gradeLevel || 'غير محدد'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'groups',
                  header: 'المجموعات',
                  render: (student) => (
                    <div className="flex flex-wrap gap-2">
                      {student.groups.length > 0 ? (
                        student.groups.map((group) => (
                          <span
                            key={group.id}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            {group.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          غير مسجل
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'payment',
                  header: 'حالة الدفع',
                  render: (student) => (
                    <Badge variant={paymentStatusVariants[student.paymentStatus]}>
                      {paymentStatusLabels[student.paymentStatus]}
                    </Badge>
                  ),
                },
                {
                  key: 'parentPhone',
                  header: 'هاتف ولي الأمر',
                  render: (student) => student.parentPhone || 'غير متوفر',
                },
              ]}
            />
          </div>
        </>
      )}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl dark:bg-slate-950 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                  إضافة طالب جديد
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  أدخل بيانات الطالب واختر المجموعة أو المجموعات المناسبة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className={joinClasses(
                  'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900',
                )}
              >
                x
              </button>
            </div>

            <StudentForm
              mode="create"
              availableGroups={groups}
              onSuccess={() => setIsCreateModalOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
