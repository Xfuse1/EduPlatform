import type { ReactNode } from 'react'

type TenantLayoutProps = {
  children: ReactNode
}

export default function TenantLayout({ children }: TenantLayoutProps) {
  return <>{children}</>
}
