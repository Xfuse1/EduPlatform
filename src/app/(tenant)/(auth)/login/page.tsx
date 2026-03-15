'use client'

import LoginForm from '@/modules/auth/components/LoginForm'
import { useTenant } from '@/components/shared/TenantProvider'

export default function LoginPage() {
  const tenant = useTenant()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] bg-gradient-to-l from-sky-900 via-sky-800 to-cyan-700 px-8 py-10 text-white shadow-xl">
          <p className="text-sm font-semibold text-sky-100">بوابة الدخول</p>
          <h1 className="mt-3 text-3xl font-black leading-tight">
            {tenant.name}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-sky-50/90">
            ادخل إلى حسابك عبر رمز تحقق قصير يُرسل إلى الهاتف المسجل داخل
            المؤسسة، ثم انتقل مباشرة إلى لوحة التحكم المناسبة لدورك.
          </p>
        </section>

        <LoginForm tenantName={tenant.name} />
      </div>
    </main>
  )
}
