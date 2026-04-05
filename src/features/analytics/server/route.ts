import Elysia, { t } from 'elysia'
import { trackEvent, getGrowthSnapshot } from '@/features/analytics/lib/server'
import { getSession } from '@/lib/session'

export const analytics = new Elysia({ prefix: '/analytics' })
  .post(
    '/track',
    async (ctx) => {
      const session = await getSession(ctx.request)

      // Do not await DB: client analytics should not pay Neon RTT on every click/view.
      void trackEvent({
        name: ctx.body.name,
        userId: session?.userId ?? null,
        path: ctx.body.path ?? null,
        properties: ctx.body.properties ?? {},
      }).catch(err => console.error('[analytics track]', err))

      return { ok: true }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        path: t.Optional(t.String()),
        properties: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    }
  )
  .get('/summary', async (ctx) => {
    const session = await getSession(ctx.request)
    if (!session) {
      ctx.set.status = 401
      return { error: 'Not authenticated' }
    }
    if (session.role !== 'ADMIN') {
      ctx.set.status = 403
      return { error: 'Forbidden' }
    }

    const snapshot = await getGrowthSnapshot()
    return { snapshot }
  })
