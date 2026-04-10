import Elysia, { t } from 'elysia'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { detectEmotion } from '@/lib/emotion'
import { generateJournalDaySummary, generateJournalReflection } from '@/lib/ai'
import { trackEvent } from '@/features/analytics/lib/server'
import { getFreeJournalAiUsage, getFreeJournalUsage } from '@/features/pricing/lib/limits'

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (date.toISOString().slice(0, 10) !== value) return null

  return date
}

function parseMonthKey(value?: string): { monthKey: string; start: Date; end: Date } | null {
  const monthKey = value?.trim() || new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null

  const start = new Date(`${monthKey}-01T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) return null

  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)

  return { monthKey, start, end }
}

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function buildDaySummary(reflection: string, fallbackContent: string): string {
  const source = reflection.trim() || fallbackContent.trim()
  if (!source) return ''
  return source
}

async function getSerializedJournalDay(userId: string, date: Date) {
  const day = await prisma.journalDay.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    include: {
      entries: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return day ? {
    id: day.id,
    date: getDateKey(day.date),
    mood: day.mood,
    summary: day.summary,
    entries: day.entries,
    updatedAt: day.updatedAt,
  } : null
}

export const journal = new Elysia({ prefix: '/journal' })
  .get(
    '/month',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const parsed = parseMonthKey(ctx.query.month)
      if (!parsed) {
        ctx.set.status = 400
        return { error: 'Invalid month. Use YYYY-MM.' }
      }

      const [days, journalUsage, journalAiUsage] = await Promise.all([
        prisma.journalDay.findMany({
          where: {
            userId: session.userId,
            date: {
              gte: parsed.start,
              lt: parsed.end,
            },
          },
          orderBy: { date: 'asc' },
          include: {
            _count: { select: { entries: true } },
          },
        }),
        getFreeJournalUsage(session.userId),
        getFreeJournalAiUsage(session.userId),
      ])

      return {
        month: parsed.monthKey,
        days: days.map(day => ({
          id: day.id,
          date: getDateKey(day.date),
          mood: day.mood,
          summary: day.summary,
          entryCount: day._count.entries,
          updatedAt: day.updatedAt,
        })),
        journalUsage,
        journalAiUsage,
      }
    },
    {
      query: t.Object({
        month: t.Optional(t.String()),
      }),
    }
  )
  .get('/:date', async (ctx) => {
    const session = await getSession(ctx.request)
    if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

    const date = parseDateKey(ctx.params.date)
    if (!date) {
      ctx.set.status = 400
      return { error: 'Invalid date. Use YYYY-MM-DD.' }
    }

    const [day, journalUsage, journalAiUsage] = await Promise.all([
      getSerializedJournalDay(session.userId, date),
      getFreeJournalUsage(session.userId),
      getFreeJournalAiUsage(session.userId),
    ])

    return {
      day: day ?? {
        id: null,
        date: ctx.params.date,
        mood: null,
        summary: null,
        entries: [],
        updatedAt: null,
      },
      journalUsage,
      journalAiUsage,
    }
  })
  .post(
    '/',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const date = parseDateKey(ctx.body.date)
      if (!date) {
        ctx.set.status = 400
        return { error: 'Invalid date. Use YYYY-MM-DD.' }
      }

      const journalUsage = await getFreeJournalUsage(session.userId)
      if (journalUsage.remaining <= 0) {
        ctx.set.status = 403
        return {
          code: 'FREE_JOURNAL_LIMIT_REACHED',
          error: 'You have reached the free journal limit for this month. Upgrade to keep writing.',
          journalUsage,
          upgradeUrl: '/pricing',
        }
      }

      const detectedMood = detectEmotion(ctx.body.content)
      const entryMood = ctx.body.mood ?? (detectedMood !== 'neutral' ? detectedMood : undefined)

      const day = await prisma.journalDay.upsert({
        where: {
          userId_date: {
            userId: session.userId,
            date,
          },
        },
        update: {
          ...(entryMood ? { mood: entryMood } : {}),
        },
        create: {
          userId: session.userId,
          date,
          mood: entryMood ?? null,
        },
      })

      await prisma.journalEntry.create({
        data: {
          journalDayId: day.id,
          content: ctx.body.content,
          mood: entryMood ?? null,
        },
      })

      const entryCount = await prisma.journalEntry.count({
        where: { journalDayId: day.id },
      })

      await trackEvent({
        name: entryCount === 1 ? 'first_journal_entry_created' : 'journal_entry_created',
        userId: session.userId,
        path: `/journal/${ctx.body.date}`,
        properties: {
          date: ctx.body.date,
          mood: entryMood ?? null,
        },
      })

      const updatedDay = await getSerializedJournalDay(session.userId, date)

      return {
        day: updatedDay,
        journalUsage: {
          ...journalUsage,
          used: journalUsage.used + 1,
          remaining: Math.max(0, journalUsage.remaining - 1),
        },
      }
    },
    {
      body: t.Object({
        date: t.String(),
        content: t.String({ minLength: 1 }),
        mood: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/:date/action',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const date = parseDateKey(ctx.params.date)
      if (!date) {
        ctx.set.status = 400
        return { error: 'Invalid date. Use YYYY-MM-DD.' }
      }

      const day = await prisma.journalDay.findUnique({
        where: {
          userId_date: {
            userId: session.userId,
            date,
          },
        },
      })
      if (!day) {
        ctx.set.status = 404
        return { error: 'No journal entries found for this day yet.' }
      }

      const entries = await prisma.journalEntry.findMany({
        where: { journalDayId: day.id },
        orderBy: { createdAt: 'asc' },
        select: {
          content: true,
          mood: true,
        },
      })
      if (entries.length === 0) {
        ctx.set.status = 404
        return { error: 'No journal entries found for this day yet.' }
      }

      const journalAiUsage = await getFreeJournalAiUsage(session.userId)
      if (journalAiUsage.remaining <= 0) {
        ctx.set.status = 403
        return {
          code: 'FREE_JOURNAL_AI_LIMIT_REACHED',
          error:
            'You have used your free AI reflections and summaries for this month. Upgrade to Closer Plus for unlimited.',
          journalAiUsage,
          upgradeUrl: '/pricing',
        }
      }

      try {
        await trackEvent({
          name: ctx.body.action === 'reflect' ? 'journal_reflection_requested' : 'journal_summary_requested',
          userId: session.userId,
          path: `/journal/${ctx.params.date}`,
          properties: {
            date: ctx.params.date,
            entryCount: entries.length,
          },
        })

        const output = ctx.body.action === 'reflect'
          ? await generateJournalReflection(entries, {
            dateLabel: ctx.params.date,
            mood: day.mood ?? undefined,
            previousSummary: day.summary ?? undefined,
          })
          : await generateJournalDaySummary(entries, {
            dateLabel: ctx.params.date,
            mood: day.mood ?? undefined,
          })

        await prisma.journalDay.update({
          where: { id: day.id },
          data: {
            summary: buildDaySummary(output, entries[entries.length - 1]?.content ?? ''),
          },
        })

        await trackEvent({
          name: ctx.body.action === 'reflect' ? 'journal_reflection_completed' : 'journal_summary_completed',
          userId: session.userId,
          path: `/journal/${ctx.params.date}`,
          properties: {
            date: ctx.params.date,
            entryCount: entries.length,
          },
        })

        const nextAiUsage = {
          ...journalAiUsage,
          used: journalAiUsage.used + 1,
          remaining: Math.max(0, journalAiUsage.remaining - 1),
        }

        return { action: ctx.body.action, output, journalAiUsage: nextAiUsage }
      } catch (error) {
        console.error('[Journal AI Action Error]', error)
        ctx.set.status = 502
        return { error: 'Journal AI is temporarily unavailable. Please try again.' }
      }
    },
    {
      body: t.Object({
        action: t.Union([t.Literal('reflect'), t.Literal('summarize')]),
      }),
    }
  )
