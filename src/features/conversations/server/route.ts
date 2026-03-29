import Elysia, { t } from 'elysia'
import { prisma } from '@/lib/prisma'
import { AIQuotaExhaustedError, generateAgentResponse, generateMemorySummary, generateAwayMessage, generateFollowUpMessage, extractEventFromMessage, generateOpeningMessage } from '@/lib/ai'
import { getSession } from '@/lib/session'
import { detectEmotion } from '@/lib/emotion'

const GHOST_PROBABILITY: Record<string, number> = {
  ROMANTIC: 0.20,
  BESTIE: 0.15,
  MENTOR: 0.05,
  SUPPORT: 0.03,
}

export const conversations = new Elysia({ prefix: '/conversations' })
  .post(
    '/create',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const { agentId } = ctx.body
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, creatorId: session.userId },
      })
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
        user: { select: { name: true } },
      },
    })

    if (!conversation || conversation.userId !== session.userId || conversation.agent.creatorId !== session.userId) {
      ctx.set.status = 404
      return { error: 'Conversation not found' }
    }

    const now = new Date()

    // Agent sends first message if conversation is empty
    if (conversation.messages.length === 0) {
      try {
        const openingContent = await generateOpeningMessage(
          conversation.agent as any,
          conversation.user?.name ?? undefined
        )
        await prisma.message.create({
          data: {
            conversationId: ctx.params.id,
            senderType: 'AGENT',
            senderId: conversation.agentId,
            content: openingContent,
            emotion: 'neutral',
          },
        })
      } catch (err) {
        console.error('[Opening message error]', err)
      }
    }

    // Agent comeback detection
    if (conversation.agentAvailableAt && conversation.agentAvailableAt <= now) {
      const updated = await prisma.conversation.updateMany({
        where: {
          id: ctx.params.id,
          agentAvailableAt: { not: null, lte: now },
        },
        data: { agentAvailableAt: null },
      })

      if (updated.count > 0) {
        await prisma.message.create({
          data: {
            conversationId: ctx.params.id,
            senderType: 'AGENT',
            senderId: conversation.agentId,
            content: "okay i'm back 😅 sorry about that",
            emotion: 'neutral',
          },
        })
      }
    }

    // Deliver scheduled messages
    const dueMessages = await prisma.scheduledMessage.findMany({
      where: {
        conversationId: ctx.params.id,
        deliveredAt: null,
        scheduledFor: { lte: now },
      },
    })

    for (const scheduled of dueMessages) {
      let content: string
      try {
        content = await generateFollowUpMessage(
          conversation.agent as any,
          scheduled.eventType,
          conversation.user?.name ?? undefined,
          (conversation as any).summary ?? undefined
        )
      } catch {
        content = `hey how did the ${scheduled.eventType} go?`
      }

      await prisma.message.create({
        data: {
          conversationId: ctx.params.id,
          senderType: 'AGENT',
          senderId: conversation.agentId,
          content,
          emotion: 'neutral',
          createdAt: scheduled.scheduledFor,
        },
      })

      await prisma.scheduledMessage.update({
        where: { id: scheduled.id },
        data: { deliveredAt: now },
      })
    }

    // Re-fetch with delivered messages
    const fresh = await prisma.conversation.findUnique({
      where: { id: ctx.params.id },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    return {
      conversation: {
        ...fresh,
        agentAvailableAt: fresh?.agentAvailableAt?.toISOString() ?? null,
      },
    }
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

      if (!conversation || conversation.userId !== session.userId || conversation.agent.creatorId !== session.userId) {
        ctx.set.status = 404
        return { error: 'Conversation not found' }
      }

      const userEmotion = detectEmotion(message)

      // Save human message always
      await prisma.message.create({
        data: {
          conversationId,
          senderType: 'HUMAN',
          senderId: session.userId,
          content: message,
          emotion: userEmotion,
        },
      })

      const now = new Date()
      const agentAvailableAt = (conversation as any).agentAvailableAt as Date | null

      // Check if agent is currently away
      if (agentAvailableAt && agentAvailableAt > now) {
        const silent = Math.random() < 0.70
        if (silent) {
          return {
            message: null,
            userEmotion,
            agentAway: true,
            agentAvailableAt: agentAvailableAt.toISOString(),
          }
        }

        // 30% chance: short "still busy" reply
        const busyReplies = ['still busy rn 😅', '2 mins i promise', 'omg give me a sec', 'almost done brb']
        const busyContent = busyReplies[Math.floor(Math.random() * busyReplies.length)]
        const busyMsg = await prisma.message.create({
          data: {
            conversationId,
            senderType: 'AGENT',
            senderId: conversation.agentId,
            content: busyContent,
            emotion: 'neutral',
          },
        })

        return {
          message: busyMsg,
          userEmotion,
          agentAway: true,
          agentAvailableAt: agentAvailableAt.toISOString(),
        }
      }

      // Ghost probability check
      const ghostProb = GHOST_PROBABILITY[conversation.agent.relationshipType] ?? 0
      if (Math.random() < ghostProb) {
        const awayMinutes = Math.floor(Math.random() * (180 - 30 + 1)) + 30
        const awayUntil = new Date(Date.now() + awayMinutes * 60 * 1000)

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { agentAvailableAt: awayUntil },
        })

        let awayContent: string
        try {
          awayContent = await generateAwayMessage(conversation.agent as any)
        } catch {
          awayContent = 'brb in a bit 😊'
        }

        const awayMsg = await prisma.message.create({
          data: {
            conversationId,
            senderType: 'AGENT',
            senderId: conversation.agentId,
            content: awayContent,
            emotion: 'neutral',
          },
        })

        return {
          message: awayMsg,
          userEmotion,
          agentAway: true,
          agentAvailableAt: awayUntil.toISOString(),
        }
      }

      // Normal response
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
          session.name,
          (conversation as any).summary ?? undefined
        )
      } catch (err) {
        console.error('[AI Error]', err)
        if (err instanceof AIQuotaExhaustedError) {
          ctx.set.status = 429
          return { error: 'AI is currently at capacity. Please retry in a moment.' }
        }

        ctx.set.status = 502
        return { error: 'AI service temporarily unavailable. Please try again.' }
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

      const humanCount = await prisma.message.count({
        where: { conversationId, senderType: 'HUMAN' },
      })

      if (humanCount % 10 === 0) {
        generateMemorySummary(
          recentMessages,
          conversation.agent.name,
          (conversation as any).summary ?? undefined
        )
          .then(summary => prisma.conversation.update({ where: { id: conversationId }, data: { summary } }))
          .catch(console.error)
      }

      // Fire-and-forget event extraction
      extractEventFromMessage(message, conversation.agent.name)
        .then(async (event) => {
          if (!event.detected || !event.scheduledFor || !event.eventType) return

          // Guard against duplicate undelivered event of same type
          const existing = await prisma.scheduledMessage.findFirst({
            where: { conversationId, eventType: event.eventType, deliveredAt: null },
          })
          if (existing) return

          await prisma.scheduledMessage.create({
            data: {
              conversationId,
              scheduledFor: event.scheduledFor,
              eventType: event.eventType,
            },
          })
        })
        .catch(console.error)

      return {
        message: agentMessage,
        userEmotion,
        agentAway: false,
        agentAvailableAt: null,
      }
    },
    {
      body: t.Object({
        conversationId: t.String(),
        message: t.String({ minLength: 1 }),
      }),
    }
  )
