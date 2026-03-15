import type { ReactNode } from 'react'

import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import Sidebar, { type DashboardRole } from '@/components/layout/Sidebar'

type AppShellProps = {
  children: ReactNode
  role: DashboardRole
  tenantName?: string
  userName?: string
  avatarUrl?: string | null
  profileHref?: string
  logoutHref?: string
}

export default function AppShell({
  children,
  role,
  tenantName,
  userName,
  avatarUrl,
  profileHref,
  logoutHref,
}: AppShellProps) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50"
    >
      <div className="flex min-h-screen">
        <div className="hidden w-72 shrink-0 md:block">
          <Sidebar role={role} />
        </div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Header
            tenantName={tenantName}
            userName={userName}
            avatarUrl={avatarUrl}
            profileHref={profileHref}
            logoutHref={logoutHref}
          />

          <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>

      <MobileNav role={role} />
    </div>
  )
}
