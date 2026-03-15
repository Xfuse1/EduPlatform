'use server'

import type { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireTenant } from '@/lib/tenant'
import { ROUTES } from '@/config/routes'

import { parseGroupFormData } from './validations'

const MANAGE_GROUP_ROLES: UserRole[] = ['TEACHER', 'ASSISTANT']

function assertCanManageGroups(role: UserRole) {
  if (!MANAGE_GROUP_ROLES.includes(role)) {
    throw new Error('ليس لديك صلاحية لإدارة المجموعات')
  }
}

function revalidateGroupPages(groupId?: string) {
  revalidatePath(ROUTES.teacher.groups)

  if (groupId) {
    revalidatePath(`${ROUTES.teacher.groups}/${groupId}`)
    revalidatePath(`${ROUTES.teacher.groups}/${groupId}/edit`)
  }
}

async function getScopedGroup(tenantId: string, groupId: string) {
  return db.group.findFirst({
    where: {
      id: groupId,
      tenantId,
    },
  })
}

async function ensureUniqueGroupName(
  tenantId: string,
  name: string,
  currentGroupId?: string,
) {
  const existingGroup = await db.group.findFirst({
    where: {
      tenantId,
      isActive: true,
      ...(currentGroupId
        ? {
            id: {
              not: currentGroupId,
            },
          }
        : {}),
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  })

  if (existingGroup) {
    throw new Error('توجد مجموعة أخرى بنفس الاسم داخل نفس المؤسسة')
  }
}

export async function createGroup(formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageGroups(user.role)

  const data = parseGroupFormData(formData)
  await ensureUniqueGroupName(tenant.id, data.name)

  const group = await db.group.create({
    data: {
      tenantId: tenant.id,
      ...data,
      room: data.room ?? null,
    },
  })

  revalidateGroupPages(group.id)

  return group
}

export async function updateGroup(groupId: string, formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageGroups(user.role)

  const existingGroup = await getScopedGroup(tenant.id, groupId)

  if (!existingGroup) {
    throw new Error('المجموعة غير موجودة')
  }

  const data = parseGroupFormData(formData)
  await ensureUniqueGroupName(tenant.id, data.name, existingGroup.id)

  const group = await db.group.update({
    where: {
      id: existingGroup.id,
    },
    data: {
      ...data,
      room: data.room ?? null,
    },
  })

  revalidateGroupPages(group.id)

  return group
}

export async function archiveGroup(groupId: string) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageGroups(user.role)

  const existingGroup = await getScopedGroup(tenant.id, groupId)

  if (!existingGroup) {
    throw new Error('المجموعة غير موجودة')
  }

  const group = await db.group.update({
    where: {
      id: existingGroup.id,
    },
    data: {
      isActive: false,
    },
  })

  revalidateGroupPages(group.id)

  return group
}

export async function duplicateGroup(groupId: string) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  assertCanManageGroups(user.role)

  const existingGroup = await getScopedGroup(tenant.id, groupId)

  if (!existingGroup) {
    throw new Error('المجموعة غير موجودة')
  }

  const group = await db.group.create({
    data: {
      tenantId: tenant.id,
      name: `${existingGroup.name} (نسخة)`,
      subject: existingGroup.subject,
      gradeLevel: existingGroup.gradeLevel,
      days: existingGroup.days,
      timeStart: existingGroup.timeStart,
      timeEnd: existingGroup.timeEnd,
      room: existingGroup.room,
      maxCapacity: existingGroup.maxCapacity,
      monthlyFee: existingGroup.monthlyFee,
      color: existingGroup.color,
      isActive: true,
    },
  })

  revalidateGroupPages(group.id)

  return group
}
