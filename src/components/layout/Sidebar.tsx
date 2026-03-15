'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type DashboardRole = 'teacher' | 'student' | 'parent'

type NavigationItem = {
  href: string
  label: string
  shortLabel: string
  activeMode?: 'exact' | 'section' | 'nested'
}

type SidebarProps = {
  role: DashboardRole
  className?: string
}

const navigationByRole: Record<DashboardRole, NavigationItem[]> = {
  teacher: [
    {
      href: '/teacher',
      label: 'لوحة التحكم',
      shortLabel: 'الرئيسية',
      activeMode: 'exact',
    },
    { href: '/teacher/groups', label: 'المجموعات', shortLabel: 'المجموعات' },
    { href: '/teacher/students', label: 'الطلاب', shortLabel: 'الطلاب' },
    { href: '/attendance', label: 'الحضور', shortLabel: 'الحضور' },
    { href: '/payments', label: 'المصاريف', shortLabel: 'المصاريف' },
    { href: '/teacher/schedule', label: 'الجدول', shortLabel: 'الجدول' },
    { href: '/teacher/settings', label: 'الإعدادات', shortLabel: 'الإعدادات' },
  ],
  student: [
    {
      href: '/student',
      label: 'لوحة التحكم',
      shortLabel: 'الرئيسية',
      activeMode: 'exact',
    },
    { href: '/student/schedule', label: 'جدولي', shortLabel: 'جدولي' },
  ],
  parent: [
    {
      href: '/parent',
      label: 'لوحة التحكم',
      shortLabel: 'الرئيسية',
      activeMode: 'exact',
    },
    {
      href: '/parent',
      label: 'أبنائي',
      shortLabel: 'أبنائي',
      activeMode: 'nested',
    },
  ],
}

export function getNavigationItems(role: DashboardRole) {
  return navigationByRole[role]
}

function isActivePath(pathname: string, item: NavigationItem) {
  if (item.activeMode === 'exact') {
    return pathname === item.href
  }

  if (item.activeMode === 'nested') {
    return pathname.startsWith(`${item.href}/`)
  }

  if (item.href === '/teacher' || item.href === '/student' || item.href === '/parent') {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function getRoleLabel(role: DashboardRole) {
  switch (role) {
    case 'teacher':
      return 'حساب المعلم'
    case 'student':
      return 'حساب الطالب'
    case 'parent':
      return 'حساب ولي الأمر'
  }
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname()
  const items = getNavigationItems(role)

  return (
    <aside
      className={joinClasses(
        'flex h-full min-h-screen w-full flex-col border-e border-slate-200 bg-white/95 px-4 py-5 text-start shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95',
        className,
      )}
    >
      <div className="rounded-3xl bg-gradient-to-br from-sky-800 via-sky-700 to-cyan-600 px-4 py-5 text-white shadow-lg">
        <p className="text-xs font-medium text-sky-100">EduPlatform</p>
        <h2 className="mt-2 text-xl font-bold">لوحة الإدارة</h2>
        <p className="mt-1 text-sm text-sky-100">{getRoleLabel(role)}</p>
      </div>

      <nav className="mt-6 flex-1 space-y-2">
        {items.map((item) => {
          const active = isActivePath(pathname, item)

          return (
            <Link
              key={`${role}-${item.href}-${item.label}`}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={joinClasses(
                'group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-sky-100 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-900/40 dark:text-sky-100 dark:ring-sky-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
              )}
            >
              <span>{item.label}</span>
              <span
                className={joinClasses(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  active
                    ? 'bg-sky-600 dark:bg-sky-300'
                    : 'bg-slate-300 group-hover:bg-slate-400 dark:bg-slate-700 dark:group-hover:bg-slate-500',
                )}
              />
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          جاهز للعمل
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          التنقل مهيأ للموبايل ويدعم RTL.
        </p>
      </div>
    </aside>
  )
}
