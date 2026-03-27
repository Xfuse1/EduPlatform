'use server'

import type { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { formatDisplayTime, parseTimeToMinutes } from '@/lib/schedule'
import { requireTenant } from '@/lib/tenant'
import { ROUTES } from '@/config/routes'

import { parseGroupFormData } from './validations'

const MANAGE_GROUP_ROLES: UserRole[] = ['TEACHER', 'ASSISTANT']
const DAY_ALIASES: Record<string, string> = {
  saturday: 'saturday',
  sunday: 'sunday',
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  'السبت': 'saturday',
  'الأحد': 'sunday',
  'الاحد': 'sunday',
  'الاثنين': 'monday',
  'الإثنين': 'monday',
  'الثلاثاء': 'tuesday',
  'الأربعاء': 'wednesday',
  'الاربعاء': 'wednesday',
  'الخميس': 'thursday',
  'الجمعة': 'friday',
}

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

function normalizeGroupDays(days: string[]) {
  return days
    .map((day) => {
      const trimmed = day.trim()
      return DAY_ALIASES[trimmed.toLowerCase()] ?? DAY_ALIASES[trimmed] ?? ''
    })
    .filter(Boolean)
}

function normalizeGroupTime(value: string) {
  const trimmed = value.trim()

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const minutes = parseTimeToMinutes(trimmed)

  if (minutes === null) {
    return trimmed
  }

  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mins = String(minutes % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

function toArabicDay(day: string) {
  switch (day) {
    case 'saturday':
      return 'السبت'
    case 'sunday':
      return 'الأحد'
    case 'monday':
      return 'الاثنين'
    case 'tuesday':
      return 'الثلاثاء'
    case 'wednesday':
      return 'الأربعاء'
    case 'thursday':
      return 'الخميس'
    case 'friday':
      return 'الجمعة'
    default:
      return day
  }
}

async function getGroupClientItem(groupId: string) {
  const group = await db.group.findUnique({
    where: {
      id: groupId,
    },
    include: {
      students: {
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      },
    },
  })

  if (!group) {
    return null
  }

  return {
    id: group.id,
    name: group.name,
    subject: group.subject,
    gradeLevel: group.gradeLevel,
    days: group.days.map(toArabicDay),
    timeStart: formatDisplayTime(group.timeStart),
    timeEnd: formatDisplayTime(group.timeEnd),
    room: group.room,
    monthlyFee: group.monthlyFee,
    maxCapacity: group.maxCapacity,
    enrolledCount: group.students.length,
    color: group.color,
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
      teacherId: user.role === 'TEACHER' ? user.id : null,
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
      teacherId: existingGroup.teacherId ?? (user.role === 'TEACHER' ? user.id : null),
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

export async function saveGroup(input: {
  id?: string
  name: string
  subject: string
  gradeLevel?: string
  room?: string | null
  days: string[]
  timeStart: string
  timeEnd: string
  monthlyFee: number
  maxCapacity: number
  color?: string
}) {
  try {
    const tenant = await requireTenant()
    const user = await requireAuth()

    assertCanManageGroups(user.role)

    const payload = parseGroupFormData({
      ...input,
      gradeLevel: input.gradeLevel?.trim() || 'عام',
      room: input.room?.trim() || undefined,
      days: normalizeGroupDays(input.days),
      timeStart: normalizeGroupTime(input.timeStart),
      timeEnd: normalizeGroupTime(input.timeEnd),
      color: input.color?.trim() || '#2E86C1',
    })

    let groupId = input.id

    if (groupId) {
      const existingGroup = await getScopedGroup(tenant.id, groupId)

      if (!existingGroup) {
        throw new Error('المجموعة غير موجودة')
      }

      await ensureUniqueGroupName(tenant.id, payload.name, existingGroup.id)

      await db.group.update({
        where: {
          id: existingGroup.id,
        },
        data: {
          teacherId: existingGroup.teacherId ?? (user.role === 'TEACHER' ? user.id : null),
          ...payload,
          room: payload.room ?? null,
        },
      })
    } else {
      await ensureUniqueGroupName(tenant.id, payload.name)

      const group = await db.group.create({
        data: {
          tenantId: tenant.id,
          teacherId: user.role === 'TEACHER' ? user.id : null,
          ...payload,
          room: payload.room ?? null,
        },
      })

      groupId = group.id
    }

    revalidateGroupPages(groupId)
    const group = await getGroupClientItem(groupId)

    if (!group) {
      throw new Error('تعذر تحميل بيانات المجموعة بعد الحفظ')
    }

    return {
      success: true,
      group,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'تعذر حفظ المجموعة',
    }
  }
}
