import { prisma } from '@/lib/prisma'
import { userHasActivePlus } from '@/features/subscriptions/lib/subscription-access'

export const FREE_PLAN_LIMITS = {
  companions: 2,
  monthlyMessages: 50,
  monthlyJournalEntries: 100,
} as const

/** Practical “unlimited” for Closr Plus (Razorpay-backed). */
export const PLUS_PLAN_LIMITS = {
  companions: 1_000_000,
  monthlyMessages: 1_000_000,
  monthlyJournalEntries: 1_000_000,
} as const

export interface LimitUsage {
  used: number
  limit: number
  remaining: number
}

function buildUsage(used: number, limit: number): LimitUsage {
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}

function getCurrentMonthWindow() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { start, end }
}

async function getLimitsForUser(userId: string) {
  const plus = await userHasActivePlus(userId)
  return plus ? PLUS_PLAN_LIMITS : FREE_PLAN_LIMITS
}

export async function getFreeCompanionUsage(userId: string) {
  const limits = await getLimitsForUser(userId)
  const used = await prisma.agent.count({
    where: { creatorId: userId },
  })

  return buildUsage(used, limits.companions)
}

export async function getFreeMessageUsage(userId: string) {
  const limits = await getLimitsForUser(userId)
  const { start, end } = getCurrentMonthWindow()
  const used = await prisma.message.count({
    where: {
      senderType: 'HUMAN',
      senderId: userId,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  })

  return buildUsage(used, limits.monthlyMessages)
}

export async function getFreeJournalUsage(userId: string) {
  const limits = await getLimitsForUser(userId)
  const { start, end } = getCurrentMonthWindow()
  const used = await prisma.journalEntry.count({
    where: {
      createdAt: {
        gte: start,
        lt: end,
      },
      journalDay: {
        userId,
      },
    },
  })

  return buildUsage(used, limits.monthlyJournalEntries)
}
