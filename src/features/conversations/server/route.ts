import Elysia, { t } from 'elysia'
import { prisma } from '@/lib/prisma'
import { generateAgentResponse } from '@/lib/ai'
import { getSession } from '@/lib/session'
import { detectEmotion } from '@/lib/emotion'

export const conversations = new Elysia({ prefix: '/conversations' })
  .post(
    '/create',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const { agentId } = ctx.body
      const agent = await prisma.agent.findUnique({ where: { id: agentId } })
      if (!agent) { ctx.set.status = 404; return { error: 'Agent not found' } }

      let conversation = await prisma.conversation.findFirst({
        where: { userId: session.userId, agentId },
      })

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { userId: session.userId, agentId },
        })
      }

      return { conversation }
    },
    { body: t.Object({ agentId: t.String() }) }
  )
  .get('/:id/messages', async (ctx) => {
    const session = await getSession(ctx.request)
    if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

    const conversation = await prisma.conversation.findUnique({
      where: { id: ctx.params.id },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!conversation || conversation.userId !== session.userId) {
      ctx.set.status = 404
      return { error: 'Conversation not found' }
    }

    return { conversation }
  })
  .post(
    '/',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const { conversationId, message } = ctx.body

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { agent: true },
      })

      if (!conversation || conversation.userId !== session.userId) {
        ctx.set.status = 404
        return { error: 'Conversation not found' }
      }

      const userEmotion = detectEmotion(message)

      await prisma.message.create({
        data: {
          conversationId,
          senderType: 'HUMAN',
          senderId: session.userId,
          content: message,
          emotion: userEmotion,
        },
      })

      const recentMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      recentMessages.reverse()

      let agentResponse: string
      try {
        agentResponse = await generateAgentResponse(
          conversation.agent as any,
          recentMessages,
          userEmotion,
          session.name
        )
      } catch (err) {
        console.error('[AI Error]', err)
        ctx.set.status = 502
        return { error: 'AI service unavailable. Check your GOOGLE_API_KEY.' }
      }

      const agentMessage = await prisma.message.create({
        data: {
          conversationId,
          senderType: 'AGENT',
          senderId: conversation.agentId,
          content: agentResponse,
          emotion: 'neutral',
        },
      })

      return { message: agentMessage, userEmotion }
    },
    {
      body: t.Object({
        conversationId: t.String(),
        message: t.String({ minLength: 1 }),
      }),
    }
  )
