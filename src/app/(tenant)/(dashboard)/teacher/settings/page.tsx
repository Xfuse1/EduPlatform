import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import TenantSettingsForm from '@/modules/settings/components/TenantSettingsForm'
import { getTenantSettings } from '@/modules/settings/queries'

export default async function TeacherSettingsPage() {
  const [tenant, user] = await Promise.all([requireTenant(), requireAuth()])

  if (user.role !== 'TEACHER') {
    notFound()
  }

  const tenantSettings = await getTenantSettings(tenant.id)

  if (!tenantSettings) {
    notFound()
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:px-8">
        <p className="text-sm text-sky-700 dark:text-sky-300">
          إعدادات المؤسسة
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
          إدارة الهوية والبيانات العامة
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          عدّل اسم المؤسسة، اللون الرئيسي، الشعار، المواد، والمنطقة من شاشة واحدة.
        </p>
      </div>

      <TenantSettingsForm tenant={tenantSettings} />
    </section>
  )
}
