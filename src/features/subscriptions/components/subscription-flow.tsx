'use client'

import { pricingPlans } from '@/lib/pricing'
import { PricingCards } from './pricing-cards'
import { useAuth } from '@/features/auth/components/auth-provider'
import { useSubscriptionMe } from '../api/use-subscription-me'
import { useSubscribePlus } from '../hooks/use-subscribe-plus'

export function SubscriptionFlow() {
  const { user, loading: authLoading } = useAuth()
  const { data: subData, isLoading: subLoading } = useSubscriptionMe(!authLoading)
  const { subscribeToPlus, subscribing, banner, clearBanner } = useSubscribePlus()

  const plusActive = subData?.subscription?.status === 'ACTIVE' && subData.subscription.planSlug === 'plus'
  const plusPending = subData?.subscription?.status === 'PENDING'

  if (authLoading || subLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
        <div className="h-96 rounded-3xl bg-white/[0.04]" />
        <div className="h-96 rounded-3xl bg-white/[0.04]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {banner && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
          <span>{banner}</span>{' '}
          <button type="button" onClick={clearBanner} className="underline text-zinc-400 hover:text-zinc-200">
            Dismiss
          </button>
        </p>
      )}
      <PricingCards
        plans={pricingPlans}
        loggedIn={Boolean(user)}
        plusActive={Boolean(plusActive)}
        plusPending={Boolean(plusPending)}
        razorpayReady={Boolean(subData?.razorpayReady)}
        subscribing={subscribing}
        onSubscribePlus={subscribeToPlus}
      />
    </div>
  )
}
