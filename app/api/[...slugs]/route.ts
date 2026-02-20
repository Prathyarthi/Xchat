import { prisma } from '@/lib/prisma'
import { Elysia, t } from 'elysia'
import { conversations } from "@/features/server/route";

const app = new Elysia({ prefix: '/api' })
    .use(conversations)

export const GET = app.fetch
export const POST = app.fetch

export type AppType = typeof app