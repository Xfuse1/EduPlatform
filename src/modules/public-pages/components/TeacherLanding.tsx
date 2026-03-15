import Link from 'next/link'

import { ROUTES } from '@/config/routes'

type TeacherLandingProps = {
  tenant: {
    name: string
    bio: string | null
    subjects: string[]
    region: string | null
  }
}

export default function TeacherLanding({ tenant }: TeacherLandingProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-16">
      <section className="surface-card w-full max-w-3xl px-8 py-12 text-center">
        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          الصفحة العامة للمؤسسة
        </span>
        <h1 className="mt-5 text-3xl font-extrabold text-foreground">
          {tenant.name}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {tenant.bio ||
            'تابع التسجيل، اعرف المجموعات المتاحة، وسجل الدخول إلى لوحة التحكم من نفس الـ subdomain.'}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {tenant.subjects.map((subject) => (
            <span
              key={subject}
              className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary"
            >
              {subject}
            </span>
          ))}
          {tenant.region ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {tenant.region}
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={ROUTES.auth.login}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            تسجيل الدخول
          </Link>
          <Link
            href={ROUTES.public.register}
            className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            تسجيل طالب جديد
          </Link>
        </div>
      </section>
    </main>
  )
}
