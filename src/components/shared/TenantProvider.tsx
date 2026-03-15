'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'

type TenantContextValue = {
  id: string
  slug: string
  name: string
  themeColor: string
}

const TenantContext = createContext<TenantContextValue | null>(null)

type TenantProviderProps = {
  value: TenantContextValue
  children: ReactNode
}

export default function TenantProvider({
  value,
  children,
}: TenantProviderProps) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const context = useContext(TenantContext)

  if (!context) {
    throw new Error('TenantProvider is required before calling useTenant')
  }

  return context
}
