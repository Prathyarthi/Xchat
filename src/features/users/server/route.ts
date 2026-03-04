import Elysia, { t } from 'elysia'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const users = new Elysia({ prefix: '/users' })
  .get('/:id', async (ctx) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.params.id },
      select: { id: true, name: true, email: true, role: true, bio: true, avatar: true, createdAt: true },
    })
    if (!user) {
      ctx.set.status = 404
      return { error: 'User not found' }
    }
    return { user }
  })
  .patch(
    '/me',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const { name, bio, avatar } = ctx.body

      const user = await prisma.user.update({
        where: { id: session.userId },
        data: {
          ...(name && { name }),
          ...(bio !== undefined && { bio }),
          ...(avatar !== undefined && { avatar }),
        },
        select: { id: true, name: true, email: true, role: true, bio: true, avatar: true },
      })

      return { user }
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2 })),
        bio: t.Optional(t.String()),
        avatar: t.Optional(t.String()),
      }),
    }
  )
  .get('/:id/conversations', async (ctx) => {
    const session = await getSession(ctx.request)
    if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

    if (session.userId !== ctx.params.id) {
      ctx.set.status = 403
      return { error: 'Forbidden' }
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: ctx.params.id },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return { conversations }
  })
