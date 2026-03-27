import { db } from '@/lib/db'

export async function getTenantSettings(tenantId: string) {
  return db.tenant.findUnique({
    where: {
      id: tenantId,
    },
  })
}
