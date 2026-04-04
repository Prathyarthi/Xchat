import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getSubscriptionEntity(payload: unknown): {
  id?: string
  status?: string
  current_start?: number
  current_end?: number
} | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  const sub = p.subscription
  if (!sub || typeof sub !== 'object') return null
  const subObj = sub as Record<string, unknown>
  const entity = subObj.entity
  if (!entity || typeof entity !== 'object') return null
  return entity as {
    id?: string
    status?: string
    current_start?: number
    current_end?: number
  }
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  let valid = false
  try {
    valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    valid = false
  }
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event?: string; payload?: unknown }
  try {
    event = JSON.parse(body) as { event?: string; payload?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entity = getSubscriptionEntity(event.payload)
  const subId = entity?.id
  if (!subId) {
    return NextResponse.json({ received: true })
  }

  const row = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subId },
  })
  if (!row) {
    return NextResponse.json({ received: true })
  }

  const periodPatch =
    entity.current_start != null || entity.current_end != null
      ? {
          ...(entity.current_start != null
            ? { currentPeriodStart: new Date(entity.current_start * 1000) }
            : {}),
          ...(entity.current_end != null ? { currentPeriodEnd: new Date(entity.current_end * 1000) } : {}),
        }
      : {}

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      await prisma.subscription.update({
        where: { userId: row.userId },
        data: { status: 'ACTIVE', ...periodPatch },
      })
      break
    case 'subscription.pending':
      await prisma.subscription.update({
        where: { userId: row.userId },
        data: { status: 'PENDING' },
      })
      break
    case 'subscription.halted':
    case 'subscription.cancelled':
      await prisma.subscription.update({
        where: { userId: row.userId },
        data: { status: 'CANCELLED' },
      })
      break
    case 'subscription.paused':
      await prisma.subscription.update({
        where: { userId: row.userId },
        data: { status: 'PAUSED' },
      })
      break
    case 'subscription.completed':
      await prisma.subscription.update({
        where: { userId: row.userId },
        data: { status: 'EXPIRED' },
      })
      break
    default:
      break
  }

  return NextResponse.json({ received: true })
}
