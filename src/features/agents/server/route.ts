import Elysia, { t } from 'elysia'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { trackEvent } from '@/features/analytics/lib/server'

export const agents = new Elysia({ prefix: '/agents' })
  .get('/', async (ctx) => {
    const session = await getSession(ctx.request)
    if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

    const agentList = await prisma.agent.findMany({
      where: { creatorId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { conversations: true } } },
    })
    return { agents: agentList }
  })
  .get('/:id', async (ctx) => {
    const session = await getSession(ctx.request)
    if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

    const agent = await prisma.agent.findFirst({
      where: { id: ctx.params.id, creatorId: session.userId },
      include: { _count: { select: { conversations: true } } },
    })
    if (!agent) {
      ctx.set.status = 404
      return { error: 'Agent not found' }
    }
    return { agent }
  })
  .post(
    '/',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const { name, description, personality, interests, avatar, relationshipType } = ctx.body

      const agent = await prisma.agent.create({
        data: {
          name,
          description,
          personality: JSON.stringify(personality),
          interests: interests ?? [],
          avatar: avatar ?? null,
          relationshipType: (relationshipType as any) ?? 'BESTIE',
          creatorId: session.userId,
        },
      })

      await trackEvent({
        name: 'companion_created',
        userId: session.userId,
        path: '/agents/create',
        properties: {
          relationshipType: agent.relationshipType,
          hasInterests: agent.interests.length > 0,
        },
      })

      return { agent }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        description: t.String({ minLength: 10 }),
        personality: t.Object({
          traits: t.Optional(t.Array(t.String())),
          communicationStyle: t.Optional(t.String()),
          tone: t.Optional(t.String()),
          backstory: t.Optional(t.String()),
        }),
        interests: t.Optional(t.Array(t.String())),
        avatar: t.Optional(t.String()),
        relationshipType: t.Optional(t.String()),
      }),
    }
  )
