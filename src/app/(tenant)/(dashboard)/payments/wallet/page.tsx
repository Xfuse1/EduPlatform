export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { WalletPageClient } from '@/modules/payments/components/WalletPageClient'
import { TeacherWalletPageClient } from '@/modules/payments/components/TeacherWalletPageClient'
import { getTeacherWalletPageData } from '@/modules/payments/queries'

export default async function PaymentsWalletPage() {
  const user = await requireAuth()

  if (!['STUDENT', 'PARENT', 'TEACHER', 'CENTER_ADMIN'].includes(user.role)) {
    redirect('/teacher')
  }

  if (user.role === 'TEACHER' || user.role === 'CENTER_ADMIN') {
    const data = await getTeacherWalletPageData(user.tenantId)
    return <TeacherWalletPageClient data={data} />
  }

  if (user.role === 'PARENT') {
    const links = await db.parentStudent.findMany({
      where: { parentId: user.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        student: {
          name: 'asc',
        },
      },
    })

    const children = links.map((link) => ({ id: link.student.id, name: link.student.name }))

    return <WalletPageClient role="PARENT" userId={user.id} children={children} />
  }

  return <WalletPageClient role="STUDENT" userId={user.id} />
}
