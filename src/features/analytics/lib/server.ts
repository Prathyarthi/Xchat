import { prisma } from '@/lib/prisma'

interface AnalyticsPayload {
  name: string
  userId?: string | null
  path?: string | null
  properties?: Record<string, unknown>
}

interface AppEventGroupRow {
  name: string
  _count: {
    _all: number
  }
}

const prismaWithAnalytics = prisma as typeof prisma & {
  appEvent: {
    create: (args: {
      data: {
        name: string
        userId: string | null
        path: string | null
        properties: Record<string, unknown>
      }
    }) => Promise<unknown>
    groupBy: (args: {
      by: ['name']
      where: {
        createdAt: {
          gte: Date
        }
      }
      _count: {
        _all: true
      }
    }) => Promise<AppEventGroupRow[]>
  }
}

export async function trackEvent(payload: AnalyticsPayload) {
  await prismaWithAnalytics.appEvent.create({
    data: {
      name: payload.name,
      userId: payload.userId ?? null,
      path: payload.path ?? null,
      properties: payload.properties ?? {},
    },
  })
}

export async function getGrowthSnapshot(days = 30) {
  const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await prismaWithAnalytics.appEvent.groupBy({
    by: ['name'],
    where: {
      createdAt: {
        gte: periodStart,
      },
    },
    _count: {
      _all: true,
    },
  })

  const counts = Object.fromEntries(rows.map((row: AppEventGroupRow) => [row.name, row._count._all]))

  return {
    periodDays: days,
    counts,
  }
}
