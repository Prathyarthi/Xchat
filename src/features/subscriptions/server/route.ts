import Elysia, { t } from 'elysia'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getRazorpay } from '@/features/subscriptions/lib/razorpay'
import { isRazorpayConfigured, razorpayPlanId, razorpayPublicKey } from '@/features/subscriptions/lib/config'
import { verifySubscriptionPaymentSignature } from '@/features/subscriptions/lib/verify-payment'

export const subscriptions = new Elysia({ prefix: '/subscriptions' })
  .get('/me', async (ctx) => {
    const razorpayReady = isRazorpayConfigured()

    const session = await getSession(ctx.request)
    if (!session) {
      return {
        data: {
          subscription: null,
          razorpayReady,
        },
      }
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.userId },
    })

    return {
      data: {
        subscription,
        razorpayReady,
      },
    }
  })
  .post(
    '/create',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) {
        ctx.set.status = 401
        return { error: 'Not authenticated' }
      }

      const rzp = getRazorpay()
      const planId = razorpayPlanId()
      if (!rzp || !planId) {
        ctx.set.status = 503
        return { error: 'Payments are not configured.' }
      }

      if (ctx.body.planSlug !== 'plus') {
        ctx.set.status = 400
        return { error: 'Invalid plan' }
      }

      const user = await prisma.user.findUnique({ where: { id: session.userId } })
      if (!user) {
        ctx.set.status = 404
        return { error: 'User not found' }
      }

      const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })
      if (existing?.status === 'ACTIVE' && existing.planSlug === 'plus') {
        ctx.set.status = 409
        return { error: 'You already have an active Closr Plus subscription.' }
      }

      let customerId = user.razorpayCustomerId
      if (!customerId) {
        const customer = await rzp.customers.create({
          name: user.name,
          email: user.email,
          fail_existing: 0,
          notes: { userId: user.id },
        })
        customerId = customer.id
        await prisma.user.update({
          where: { id: user.id },
          data: { razorpayCustomerId: customerId },
        })
      }

      const key = razorpayPublicKey()
      if (!key) {
        ctx.set.status = 503
        return { error: 'RAZORPAY_KEY_ID is missing' }
      }

      if (existing?.status === 'PENDING' && existing.razorpaySubscriptionId) {
        return {
          data: {
            razorpaySubscriptionId: existing.razorpaySubscriptionId,
            razorpayKey: key,
          },
        }
      }

      /* Razorpay SDK types omit several subscription create fields (e.g. customer_id). */
      const sub = (await rzp.subscriptions.create({
        plan_id: planId,
        customer_notify: 1,
        customer_id: customerId,
        total_count: 120,
        quantity: 1,
        notes: { userId: user.id, planSlug: 'plus' },
      } as never)) as { id: string }

      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          planSlug: 'plus',
          status: 'PENDING',
          razorpaySubscriptionId: sub.id,
        },
        update: {
          planSlug: 'plus',
          status: 'PENDING',
          razorpaySubscriptionId: sub.id,
        },
      })

      return {
        data: {
          razorpaySubscriptionId: sub.id,
          razorpayKey: key,
        },
      }
    },
    {
      body: t.Object({
        planSlug: t.Literal('plus'),
      }),
    }
  )
  .post(
    '/verify',
    async (ctx) => {
      const session = await getSession(ctx.request)
      if (!session) {
        ctx.set.status = 401
        return { error: 'Not authenticated' }
      }

      const { razorpayPaymentId, razorpaySubscriptionId, razorpaySignature } = ctx.body

      if (!verifySubscriptionPaymentSignature(razorpayPaymentId, razorpaySubscriptionId, razorpaySignature)) {
        ctx.set.status = 400
        return { error: 'Invalid payment signature' }
      }

      const row = await prisma.subscription.findFirst({
        where: {
          userId: session.userId,
          razorpaySubscriptionId,
        },
      })
      if (!row) {
        ctx.set.status = 404
        return { error: 'Subscription not found' }
      }

      const rzp = getRazorpay()
      let currentPeriodStart = row.currentPeriodStart
      let currentPeriodEnd = row.currentPeriodEnd
      if (rzp) {
        try {
          const remote = (await rzp.subscriptions.fetch(razorpaySubscriptionId)) as {
            current_start?: number
            current_end?: number
          }
          if (remote.current_start) currentPeriodStart = new Date(remote.current_start * 1000)
          if (remote.current_end) currentPeriodEnd = new Date(remote.current_end * 1000)
        } catch {
          /* Razorpay fetch is best-effort */
        }
      }

      await prisma.subscription.update({
        where: { userId: session.userId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart,
          currentPeriodEnd,
        },
      })

      return { ok: true }
    },
    {
      body: t.Object({
        razorpayPaymentId: t.String(),
        razorpaySubscriptionId: t.String(),
        razorpaySignature: t.String(),
      }),
    }
  )
