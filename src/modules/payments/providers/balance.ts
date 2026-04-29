'use server'

import { requireTenant } from '@/lib/tenant'
import {
  creditUserWallet,
  debitUserWallet,
  getOrCreateWallet,
  getWalletTransactions,
  resolveRechargeWalletOwner,
  resolveStudentWalletPayer,
} from '@/modules/wallet/provider'

export async function getStudentBalance(studentId: string, tenantId: string) {
  const { ownerType, ownerUserId } = await resolveRechargeWalletOwner(studentId, tenantId)
  const balance = await getOrCreateWallet(tenantId, ownerUserId)

  return { balance, owner: ownerType === 'USER' ? 'STUDENT' : ownerType, ownerId: ownerUserId }
}

export async function debitBalance(
  studentId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  const tenant = await requireTenant()
  return debitBalanceForTenant(tenant.id, studentId, amount, reason, relatedPaymentId)
}

export async function debitBalanceForTenant(
  tenantId: string,
  studentId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  const { payerUserId } = await resolveStudentWalletPayer(studentId, tenantId)
  return debitUserWallet({
    tenantId,
    userId: payerUserId,
    amount,
    reason,
    relatedPaymentId,
    metadata: { studentId },
  })
}

export async function creditBalance(
  userId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  const tenant = await requireTenant()
  return creditBalanceForTenant(tenant.id, userId, amount, reason, relatedPaymentId)
}

export async function creditBalanceForTenant(
  tenantId: string,
  userId: string,
  amount: number,
  reason: string,
  relatedPaymentId?: string,
) {
  const { ownerUserId, ownerType } = await resolveRechargeWalletOwner(userId, tenantId)
  return creditUserWallet({
    tenantId,
    userId: ownerUserId,
    amount,
    reason,
    relatedPaymentId,
    metadata: { requestedUserId: userId, ownerType },
  })
}

export async function getBalanceTransactions(studentId: string, limit: number = 50) {
  const tenant = await requireTenant()
  const { ownerUserId } = await resolveRechargeWalletOwner(studentId, tenant.id)
  return getWalletTransactions(tenant.id, ownerUserId, limit)
}
