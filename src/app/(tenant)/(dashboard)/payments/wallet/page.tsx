export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { WalletPageClient } from '@/modules/payments/components/WalletPageClient'

export default async function PaymentsWalletPage() {
  const user = await requireAuth()

  if (!['STUDENT', 'PARENT'].includes(user.role)) {
    redirect('/teacher')
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
