import type { ReactNode } from 'react'

import RTLProvider from '@/components/shared/RTLProvider'
import ThemeProvider from '@/components/shared/ThemeProvider'

import './globals.css'

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="font-cairo">
        <ThemeProvider>
          <RTLProvider className="min-h-screen bg-background text-foreground">
            {children}
          </RTLProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
