import { notFound } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { requireTenant } from '@/lib/tenant'
import { getGroups } from '@/modules/groups/queries'
import CSVImporter from '@/modules/students/components/CSVImporter'

const ALLOWED_ROLES = new Set(['TEACHER', 'ASSISTANT'])

export default async function ImportStudentsPage() {
  const [tenant, user] = await Promise.all([requireTenant(), requireAuth()])

  if (!ALLOWED_ROLES.has(user.role)) {
    notFound()
  }

  const groups = await getGroups(tenant.id)

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:px-8">
        <p className="text-sm text-sky-700 dark:text-sky-300">{tenant.name}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
          استيراد الطلاب من CSV
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          ارفع ملف الطلاب، راجع الأعمدة، ثم نفّذ الاستيراد مع عرض واضح لعدد النجاحات والأخطاء.
        </p>
      </div>

      <CSVImporter
        tenantId={tenant.id}
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
      />
    </section>
  )
}
