import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import AppShell from '@/components/layout/AppShell'
import { requireDashboardUser } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'

type DashboardLayoutProps = {
  children: ReactNode
}

function getDashboardRole(role: string) {
  switch (role) {
    case 'TEACHER':
    case 'ASSISTANT':
      return 'teacher' as const
    case 'STUDENT':
      return 'student' as const
    case 'PARENT':
      return 'parent' as const
    default:
      return null
  }
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [tenant, user] = await Promise.all([requireTenant(), requireDashboardUser()])
  const role = getDashboardRole(user.role)

  if (!role) {
    notFound()
  }

  return (
    <AppShell
      role={role}
      tenantName={tenant.name}
      userName={user.name}
      avatarUrl={user.avatarUrl}
      profileHref="#"
      logoutHref="/api/auth/logout"
    >
      {children}
    </AppShell>
  )
}
