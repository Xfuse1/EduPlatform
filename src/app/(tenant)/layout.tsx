import type { ReactNode } from 'react'

import TenantProvider from '@/components/shared/TenantProvider'
import { requireTenant } from '@/lib/tenant'

type TenantLayoutProps = {
  children: ReactNode
}

export default async function TenantLayout({ children }: TenantLayoutProps) {
  const tenant = await requireTenant()

  return (
    <TenantProvider
      value={{
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        themeColor: tenant.themeColor,
      }}
    >
      {children}
    </TenantProvider>
  )
}
