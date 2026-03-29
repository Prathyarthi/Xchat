import Elysia, { t } from 'elysia'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { detectEmotion } from '@/lib/emotion'
import { generateJournalReflection } from '@/lib/ai'

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

  return source.length > 180 ? `${source.slice(0, 177).trimEnd()}...` : source
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

      const days = await prisma.journalDay.findMany({
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
      })

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

    const day = await prisma.journalDay.findUnique({
      where: {
        userId_date: {
          userId: session.userId,
          date,
        },
      },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return {
      day: day ? {
        id: day.id,
        date: getDateKey(day.date),
        mood: day.mood,
        summary: day.summary,
        entries: day.entries,
        updatedAt: day.updatedAt,
      } : {
        id: null,
        date: ctx.params.date,
        mood: null,
        summary: null,
        entries: [],
        updatedAt: null,
      },
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

      const entry = await prisma.journalEntry.create({
        data: {
          journalDayId: day.id,
          content: ctx.body.content,
          mood: entryMood ?? null,
        },
      })

      const entriesForReflection = await prisma.journalEntry.findMany({
        where: { journalDayId: day.id },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          mood: true,
          aiReflection: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      let reflection: string | null = null
      try {
        reflection = await generateJournalReflection(
          entriesForReflection.map(item => ({ content: item.content, mood: item.mood })),
          {
            dateLabel: ctx.body.date,
            mood: entryMood ?? day.mood ?? undefined,
            previousSummary: day.summary ?? undefined,
          }
        )
      } catch (error) {
        console.error('[Journal Reflection Error]', error)
      }

      if (reflection) {
        await prisma.journalEntry.update({
          where: { id: entry.id },
          data: { aiReflection: reflection },
        })

        await prisma.journalDay.update({
          where: { id: day.id },
          data: {
            summary: buildDaySummary(reflection, ctx.body.content),
            mood: entryMood ?? day.mood ?? null,
          },
        })
      }

      const updatedDay = await prisma.journalDay.findUnique({
        where: { id: day.id },
        include: {
          entries: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      return {
        day: updatedDay ? {
          id: updatedDay.id,
          date: getDateKey(updatedDay.date),
          mood: updatedDay.mood,
          summary: updatedDay.summary,
          entries: updatedDay.entries,
          updatedAt: updatedDay.updatedAt,
        } : null,
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
