import { prisma } from '@/lib/prisma'
import { userHasActivePlus } from '@/features/subscriptions/lib/subscription-access'

export const FREE_PLAN_LIMITS = {
  companions: 2,
  monthlyMessages: 50,
  monthlyJournalEntries: 15,
  monthlyJournalAiActions: 10,
} as const

/** Practical “unlimited” for Closer Plus (Razorpay-backed). */
export const PLUS_PLAN_LIMITS = {
  companions: 1_000_000,
  monthlyMessages: 1_000_000,
  monthlyJournalEntries: 1_000_000,
  monthlyJournalAiActions: 1_000_000,
} as const

const JOURNAL_AI_COMPLETION_EVENTS = [
  'journal_reflection_completed',
  'journal_summary_completed',
] as const

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
  const [plus, used] = await Promise.all([
    userHasActivePlus(userId),
    prisma.agent.count({ where: { creatorId: userId } }),
  ])
  const limits = plus ? PLUS_PLAN_LIMITS : FREE_PLAN_LIMITS
  return buildUsage(used, limits.companions)
}

export async function getFreeMessageUsage(userId: string) {
  const { start, end } = getCurrentMonthWindow()
  const [plus, used] = await Promise.all([
    userHasActivePlus(userId),
    prisma.message.count({
      where: {
        senderType: 'HUMAN',
        senderId: userId,
        createdAt: { gte: start, lt: end },
      },
    }),
  ])
  const limits = plus ? PLUS_PLAN_LIMITS : FREE_PLAN_LIMITS
  return buildUsage(used, limits.monthlyMessages)
}

export async function getFreeJournalUsage(userId: string) {
  const { start, end } = getCurrentMonthWindow()
  const [plus, used] = await Promise.all([
    userHasActivePlus(userId),
    prisma.journalEntry.count({
      where: {
        createdAt: { gte: start, lt: end },
        journalDay: { userId },
      },
    }),
  ])
  const limits = plus ? PLUS_PLAN_LIMITS : FREE_PLAN_LIMITS
  return buildUsage(used, limits.monthlyJournalEntries)
}

export async function getFreeJournalAiUsage(userId: string) {
  const { start, end } = getCurrentMonthWindow()
  const [plus, used] = await Promise.all([
    userHasActivePlus(userId),
    prisma.appEvent.count({
      where: {
        userId,
        name: { in: [...JOURNAL_AI_COMPLETION_EVENTS] },
        createdAt: { gte: start, lt: end },
      },
    }),
  ])
  const limits = plus ? PLUS_PLAN_LIMITS : FREE_PLAN_LIMITS
  return buildUsage(used, limits.monthlyJournalAiActions)
}
