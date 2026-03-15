import { requireTenant } from '@/lib/tenant'
import RegistrationForm from '@/modules/public-pages/components/RegistrationForm'
import { getPublicGroups } from '@/modules/public-pages/queries'

export default async function TenantRegisterPage() {
  const tenant = await requireTenant()
  const groups = await getPublicGroups(tenant.id)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] bg-gradient-to-l from-sky-900 via-sky-800 to-cyan-700 px-8 py-10 text-white shadow-xl">
          <p className="text-sm font-semibold text-sky-100">تسجيل عام</p>
          <h1 className="mt-3 text-3xl font-black leading-tight">
            الانضمام إلى {tenant.name}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-sky-50/90">
            املأ البيانات الأساسية واختر المجموعة المناسبة. إذا كانت المجموعة
            ممتلئة سيُسجل الطالب تلقائيًا في قائمة الانتظار.
          </p>
        </section>

        <RegistrationForm groups={groups} />
      </div>
    </main>
  )
}
