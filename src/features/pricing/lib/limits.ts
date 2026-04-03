import { prisma } from '@/lib/prisma'

export const FREE_PLAN_LIMITS = {
  companions: 2,
  monthlyMessages: 50,
  monthlyJournalEntries: 200,
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

export async function getFreeCompanionUsage(userId: string) {
  const used = await prisma.agent.count({
    where: { creatorId: userId },
  })

  return buildUsage(used, FREE_PLAN_LIMITS.companions)
}

export async function getFreeMessageUsage(userId: string) {
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

  return buildUsage(used, FREE_PLAN_LIMITS.monthlyMessages)
}

export async function getFreeJournalUsage(userId: string) {
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

  return buildUsage(used, FREE_PLAN_LIMITS.monthlyJournalEntries)
}
