'use client'

import Link from 'next/link'
import { useAuth } from '@/features/auth/components/auth-provider'
import { useSubscriptionMe } from '../api/use-subscription-me'
import { SubscribePlusButton } from './subscribe-plus-button'
import { pricingPlans } from '@/lib/pricing'
import { Button } from '@/components/ui/button'

export function DashboardSubscribeCta() {
  const { user, loading: authLoading } = useAuth()
  const { data: subData, isLoading: subLoading } = useSubscriptionMe(!authLoading && Boolean(user))

  if (authLoading || !user || subLoading) return null

  const plusActive =
    subData?.subscription?.status === 'ACTIVE' && subData.subscription.planSlug === 'plus'
  if (plusActive) return null

  const plusPending = subData?.subscription?.status === 'PENDING'
  const razorpayReady = Boolean(subData?.razorpayReady)
  const plus = pricingPlans.find(p => p.slug === 'plus')

  return (
    <div className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.06] px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-teal-400/90">Closr Plus</p>
        <p className="text-sm font-semibold text-zinc-100 mt-1">
          {plusPending ? 'Finish checkout to activate your subscription' : 'Take a subscription for higher limits and proactive check-ins'}
        </p>
        {plus && (
          <p className="text-xs text-zinc-500 mt-1">
            {plus.monthlyPrice}
            {plus.pricePeriod ? ` ${plus.pricePeriod}` : ''} · billed via Razorpay
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 shrink-0 sm:items-center">
        <SubscribePlusButton
          razorpayReady={razorpayReady}
          pending={plusPending}
          size="sm"
          className="whitespace-nowrap"
        />
        <Button asChild variant="outline" size="sm" className="rounded-full border-white/10 text-zinc-300">
          <Link href="/pricing">Compare plans</Link>
        </Button>
      </div>
    </div>
  )
}
