import type { Plan } from '@/types'

type PlanLimit = {
  price: number
  maxStudents: number | null
  smsQuota: number | null
}

export const PLAN_LIMITS: Record<Plan, PlanLimit> = {
  FREE: {
    price: 0,
    maxStudents: 30,
    smsQuota: 50,
  },
  BASIC: {
    price: 199,
    maxStudents: 100,
    smsQuota: 200,
  },
  PRO: {
    price: 499,
    maxStudents: 500,
    smsQuota: 1000,
  },
  BUSINESS: {
    price: 999,
    maxStudents: null,
    smsQuota: null,
  },
}

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan]
}
