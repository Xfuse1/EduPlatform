import { headers } from 'next/headers'

export default async function HomePage() {
  const requestHeaders = await headers()
  const tenantSlug = requestHeaders.get('x-tenant-slug')

  if (tenantSlug) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-16">
        <section className="surface-card w-full max-w-2xl px-8 py-12 text-center">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            مساحة المؤسسة
          </span>
          <h1 className="mt-5 text-3xl font-extrabold text-foreground">
            الصفحة العامة للمؤسسة
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            تم تجهيز مسار الجذر للـ tenant subdomain بنجاح. الـ slug الحالي هو{' '}
            <span className="ltr-numbers font-semibold text-foreground">{tenantSlug}</span>.
          </p>
        </section>
      </main>
    )
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
          تم حل تعارض المسار الجذري `/` عبر صفحة موحدة تحدد المحتوى وفق الـ subdomain.
        </p>
      </section>
    </main>
  )
}
