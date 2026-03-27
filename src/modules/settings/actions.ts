'use server'

import { revalidatePath } from 'next/cache'

import { ROUTES } from '@/config/routes'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'

import { parseTenantSettingsFormData } from './validations'

function assertCanManageSettings(role: string) {
  if (role !== 'TEACHER' && role !== 'CENTER_ADMIN') {
    throw new Error('ليس لديك صلاحية لتعديل إعدادات المؤسسة')
  }
}

function revalidateTenantSettingsPaths() {
  revalidatePath(ROUTES.center.dashboard)
  revalidatePath(ROUTES.center.settings)
  revalidatePath(ROUTES.center.schedule)
  revalidatePath(ROUTES.center.payments)
  revalidatePath(ROUTES.teacher.dashboard)
  revalidatePath(ROUTES.teacher.settings)
  revalidatePath(ROUTES.teacher.schedule)
  revalidatePath(ROUTES.teacher.groups)
  revalidatePath(ROUTES.teacher.students)
}

export async function updateTenant(formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageSettings(user.role)

  const data = parseTenantSettingsFormData(formData)

  const updatedTenant = await db.tenant.update({
    where: {
      id: tenant.id,
    },
    data: {
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      themeColor: data.themeColor,
      bio: data.bio ?? null,
      subjects: data.subjects,
      region: data.region ?? null,
    },
  })

  revalidateTenantSettingsPaths()

  return updatedTenant
}
