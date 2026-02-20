import { generateAgentResponse } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import Elysia from "elysia";
import { z } from "zod";

export const conversations = new Elysia({ prefix: '/conversations' })
    .post('/', async (ctx) => {
        const { conversationId, message } = ctx.body;

        if (!conversationId || !message) {
            return new Response('conversationId and message are required', { status: 400 })
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { agent: true }
        })

        if (!conversation) {
            return new Response('Conversation not found', { status: 404 })
        }

        await prisma.message.create({
            data: {
                conversationId,
                senderType: 'HUMAN',
                senderId: conversation.userId,
                content: message
            }
        })

        const recentMessages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        const orderedMessages = recentMessages.reverse();

        const agentResponse = await generateAgentResponse(conversation.agent, recentMessages)

        const savedAgentMessage = await prisma.message.create({
            data: {
                conversationId,
                senderType: 'AGENT',
                senderId: conversation.agentId,
                content: agentResponse || ''
            }
        })

        return { message: savedAgentMessage }
    }, {
        body: z.object({
            conversationId: z.string(),
            message: z.string()
        })
    })