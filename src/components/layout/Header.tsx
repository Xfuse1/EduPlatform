'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'

type HeaderProps = {
  tenantName?: string
  userName?: string
  avatarUrl?: string | null
  profileHref?: string
  logoutHref?: string
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)

  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'U'
}

function ThemeToggleIcon({ isDark }: { isDark: boolean }) {
  if (isDark) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M12 3v2.25M12 18.75V21M4.875 4.875l1.575 1.575M17.55 17.55l1.575 1.575M3 12h2.25M18.75 12H21M4.875 19.125l1.575-1.575M17.55 6.45l1.575-1.575M16.5 12A4.5 4.5 0 1 1 7.5 12a4.5 4.5 0 0 1 9 0Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M21 12.8A9 9 0 0 1 11.2 3a9 9 0 1 0 9.8 9.8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Header({
  tenantName = 'اسم السنتر',
  userName = 'مستخدم المنصة',
  avatarUrl,
  profileHref = '#',
  logoutHref = '#',
}: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'
  const initials = useMemo(() => getInitials(userName), [userName])

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            اسم المؤسسة
          </p>
          <h1 className="truncate text-lg font-bold text-slate-950 dark:text-white">
            {tenantName}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          >
            <ThemeToggleIcon isDark={isDark} />
          </button>

          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-start shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-900 dark:bg-sky-900/50 dark:text-sky-100">
                  {initials}
                </span>
              )}

              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {userName}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  الملف الشخصي
                </span>
              </span>
            </summary>

            <div className="absolute start-0 top-[calc(100%+0.75rem)] w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <Link
                href={profileHref}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                الملف الشخصي
              </Link>
              <Link
                href={logoutHref}
                className="mt-1 block rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                تسجيل الخروج
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
