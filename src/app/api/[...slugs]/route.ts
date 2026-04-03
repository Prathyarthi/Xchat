import { Elysia } from 'elysia'
import { agents } from '@/features/agents/server/route'
import { users } from '@/features/users/server/route'
import { conversations } from '@/features/conversations/server/route'
import { auth } from '@/features/auth/server/route'
import { journal } from '@/features/journal/server/route'
import { analytics } from '@/features/analytics/server/route'

const app = new Elysia({ prefix: '/api' })
  .onError(({ error, set }) => {
    console.error('[API Error]', error)
    set.status = 500
    return { error: error instanceof Error ? error.message : 'Internal server error' }
  })
  .use(auth)
  .use(agents)
  .use(users)
  .use(conversations)
  .use(journal)
  .use(analytics)

export const GET    = app.fetch
export const POST   = app.fetch
export const PUT    = app.fetch
export const PATCH  = app.fetch
export const DELETE = app.fetch

export type AppType = typeof app
