import Elysia, { t } from 'elysia'
import { prisma } from '@/lib/prisma'
import { AIQuotaExhaustedError, generateAgentResponse, generateMemorySummary, generateAwayMessage, generateFollowUpMessage, extractEventFromMessage, generateOpeningMessage } from '@/lib/ai'
import { getSession } from '@/lib/session'
import { detectEmotion } from '@/lib/emotion'
import { trackEvent } from '@/features/analytics/lib/server'
import { getFreeMessageUsage } from '@/features/pricing/lib/limits'
import { userCanUseAgent } from '@/lib/agent-access'

/** Recent page size for chat; older rows load via `?beforeMessageId=`. */
const CHAT_MESSAGES_PAGE_SIZE = 50

function serializeMessagesForClient(
  messages: Array<{
    id: string
    senderType: string
    senderId: string
    content: string
    emotion: string | null
    createdAt: Date
  }>
) {
  return messages.map(m => ({
    id: m.id,
    senderType: m.senderType,
    content: m.content,
    emotion: m.emotion,
    createdAt: m.createdAt.toISOString(),
  }))
}

const GHOST_PROBABILITY: Record<string, number> = {
  ROMANTIC: 0.05,
  BESTIE: 0.04,
  MENTOR: 0.02,
  SUPPORT: 0.01,
}

export const conversations = new Elysia({ prefix: '/conversations' })
  .post(
    '/create',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const { agentId } = ctx.body
      const agent = await prisma.agent.findFirst({
        where: {
          id: agentId,
          OR: [{ creatorId: null }, { creatorId: session.userId }],
        },
      })
      if (!agent) { ctx.set.status = 404; return { error: 'Agent not found' } }

      let conversation = await prisma.conversation.findFirst({
        where: { userId: session.userId, agentId },
      })

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { userId: session.userId, agentId },
        })

        await trackEvent({
          name: 'conversation_started',
          userId: session.userId,
          path: `/agents/${agentId}`,
          properties: {
            agentId,
            relationshipType: agent.relationshipType,
          },
        })
      }

      return { conversation }
    },
    { body: t.Object({ agentId: t.String() }) }
  )
  .get(
    '/:id/messages',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const beforeMessageId = ctx.query.beforeMessageId?.trim()

      if (beforeMessageId) {
        const conversation = await prisma.conversation.findFirst({
          where: { id: ctx.params.id, userId: session.userId },
          include: { agent: true },
        })
        if (!conversation || !userCanUseAgent(conversation.agent, session.userId)) {
          ctx.set.status = 404
          return { error: 'Conversation not found' }
        }

        const cursor = await prisma.message.findFirst({
          where: { id: beforeMessageId, conversationId: ctx.params.id },
        })
        if (!cursor) {
          ctx.set.status = 400
          return { error: 'Invalid message cursor' }
        }

        const batch = await prisma.message.findMany({
          where: {
            conversationId: ctx.params.id,
            createdAt: { lt: cursor.createdAt },
          },
          orderBy: { createdAt: 'desc' },
          take: CHAT_MESSAGES_PAGE_SIZE + 1,
        })
        const hasMore = batch.length > CHAT_MESSAGES_PAGE_SIZE
        const slice = hasMore ? batch.slice(0, CHAT_MESSAGES_PAGE_SIZE) : batch
        const olderAsc = [...slice].reverse()

        return {
          messages: serializeMessagesForClient(olderAsc),
          hasMore,
        }
      }

      const [conversation, messageUsage] = await Promise.all([
        prisma.conversation.findUnique({
          where: { id: ctx.params.id },
          include: {
            agent: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: CHAT_MESSAGES_PAGE_SIZE + 1,
            },
            user: { select: { name: true } },
          },
        }),
        getFreeMessageUsage(session.userId),
      ])

      if (!conversation || conversation.userId !== session.userId || !userCanUseAgent(conversation.agent, session.userId)) {
        ctx.set.status = 404
        return { error: 'Conversation not found' }
      }

      const hasMoreRecent = conversation.messages.length > CHAT_MESSAGES_PAGE_SIZE
      const recentDesc = hasMoreRecent
        ? conversation.messages.slice(0, CHAT_MESSAGES_PAGE_SIZE)
        : conversation.messages
      const messagesAsc = [...recentDesc].reverse()

      const now = new Date()

      // Agent sends first message if conversation is empty (no rows, or all messages outside window — treat as empty for opening)
      if (messagesAsc.length === 0) {
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
        orderBy: { scheduledFor: 'asc' },
        take: 8,
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
      const [fresh, totalMessageCount] = await Promise.all([
        prisma.conversation.findUnique({
          where: { id: ctx.params.id },
          include: {
            agent: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: CHAT_MESSAGES_PAGE_SIZE + 1,
            },
          },
        }),
        prisma.message.count({ where: { conversationId: ctx.params.id } }),
      ])

      if (!fresh) {
        ctx.set.status = 404
        return { error: 'Conversation not found' }
      }

      const moreThanPage = fresh.messages.length > CHAT_MESSAGES_PAGE_SIZE
      const pageDesc = moreThanPage ? fresh.messages.slice(0, CHAT_MESSAGES_PAGE_SIZE) : fresh.messages
      const pageAsc = [...pageDesc].reverse()

      const freshAsc = {
        ...fresh,
        messages: serializeMessagesForClient(pageAsc),
      }

      return {
        conversation: {
          ...freshAsc,
          agentAvailableAt: freshAsc.agentAvailableAt?.toISOString() ?? null,
        },
        messageUsage,
        hasMore: totalMessageCount > CHAT_MESSAGES_PAGE_SIZE,
        totalMessageCount,
      }
    },
    {
      query: t.Object({
        beforeMessageId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) { ctx.set.status = 401; return { error: 'Not authenticated' } }

      const { conversationId, message } = ctx.body

      const [conversation, messageUsage] = await Promise.all([
        prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { agent: true },
        }),
        getFreeMessageUsage(session.userId),
      ])

      if (!conversation || conversation.userId !== session.userId || !userCanUseAgent(conversation.agent, session.userId)) {
        ctx.set.status = 404
        return { error: 'Conversation not found' }
      }
      if (messageUsage.remaining <= 0) {
        ctx.set.status = 403
        return {
          code: 'FREE_MESSAGE_LIMIT_REACHED',
          error: 'You have reached your message limit for this month. Upgrade to continue chatting.',
          messageUsage,
          upgradeUrl: '/pricing',
        }
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

      const conversationHumanCount = await prisma.message.count({
        where: { conversationId, senderType: 'HUMAN' },
      })

      await trackEvent({
        name: conversationHumanCount === 1 ? 'first_message_sent' : 'message_sent',
        userId: session.userId,
        path: `/chat/${conversationId}`,
        properties: {
          conversationId,
          relationshipType: conversation.agent.relationshipType,
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
            messageUsage: {
              ...messageUsage,
              used: messageUsage.used + 1,
              remaining: Math.max(0, messageUsage.limit - (messageUsage.used + 1)),
            },
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
          messageUsage: {
            ...messageUsage,
            used: messageUsage.used + 1,
            remaining: Math.max(0, messageUsage.limit - (messageUsage.used + 1)),
          },
        }
      }

      // Ghost probability check
      const ghostProb = GHOST_PROBABILITY[conversation.agent.relationshipType] ?? 0
      if (Math.random() < ghostProb) {
        const awayMinutes = Math.floor(Math.random() * (30 - 2 + 1)) + 2
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
          messageUsage: {
            ...messageUsage,
            used: messageUsage.used + 1,
            remaining: Math.max(0, messageUsage.limit - (messageUsage.used + 1)),
          },
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
        // On any AI failure (incl. quota), ghost long enough that limits may reset; show a brb message
        const errorAwayMinutes = 30
        const errorAwayUntil = new Date(Date.now() + errorAwayMinutes * 60 * 1000)
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { agentAvailableAt: errorAwayUntil },
        })
        const errorBrb = await prisma.message.create({
          data: {
            conversationId,
            senderType: 'AGENT',
            senderId: conversation.agentId,
            content: 'brb in a sec',
            emotion: 'neutral',
          },
        })
        return {
          message: errorBrb,
          userEmotion,
          agentAway: true,
          agentAvailableAt: errorAwayUntil.toISOString(),
          messageUsage: {
            ...messageUsage,
            used: messageUsage.used + 1,
            remaining: Math.max(0, messageUsage.limit - (messageUsage.used + 1)),
          },
        }
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

      const humanCount = conversationHumanCount

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
        messageUsage: {
          ...messageUsage,
          used: messageUsage.used + 1,
          remaining: Math.max(0, messageUsage.limit - (messageUsage.used + 1)),
        },
      }
    },
    {
      body: t.Object({
        conversationId: t.String(),
        message: t.String({ minLength: 1 }),
      }),
    }
  )
