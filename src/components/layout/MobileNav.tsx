'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { getNavigationItems, type DashboardRole } from '@/components/layout/Sidebar'

type MobileNavProps = {
  role: DashboardRole
}

function isActivePath(
  pathname: string,
  item: ReturnType<typeof getNavigationItems>[number],
) {
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

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname()
  const items = getNavigationItems(role)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <nav className="flex items-center gap-2 overflow-x-auto">
        {items.map((item) => {
          const active = isActivePath(pathname, item)

          return (
            <Link
              key={`${role}-${item.href}-${item.shortLabel}`}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={joinClasses(
                'flex min-w-[88px] flex-1 flex-col items-center justify-center rounded-2xl px-3 py-2 text-center text-xs font-medium transition-colors',
                active
                  ? 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
              )}
            >
              <span className="mb-1 h-2 w-2 rounded-full bg-current" />
              <span>{item.shortLabel}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
