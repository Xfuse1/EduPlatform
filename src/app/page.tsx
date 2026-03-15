import { headers } from 'next/headers'

import { getTenantFromHost } from '@/lib/tenant'
import TeacherLanding from '@/modules/public-pages/components/TeacherLanding'

export default async function HomePage() {
  const requestHeaders = await headers()
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? ''
  const tenant = await getTenantFromHost(host)

  if (tenant) {
    return <TeacherLanding tenant={tenant} />
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-16">
      <section className="surface-card w-full max-w-2xl px-8 py-12 text-center">
        <span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-sm font-semibold text-secondary">
          الموقع التسويقي
        </span>
        <h1 className="mt-5 text-3xl font-extrabold text-foreground">
          الصفحة الرئيسية لـ EduPlatform
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          منصة عربية لإدارة المجموعات والحضور والمصاريف لمراكز الدروس
          الخصوصية، مع دعم subdomains لكل مؤسسة.
        </p>
      </section>
    </main>
  )
}
