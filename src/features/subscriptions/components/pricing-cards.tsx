'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TrackedLink } from '@/components/analytics/tracked-link'
import type { PricingPlan } from '@/lib/pricing'

interface PricingCardsProps {
  plans: PricingPlan[]
  loggedIn: boolean
  plusActive: boolean
  plusPending: boolean
  razorpayReady: boolean
  subscribing: boolean
  onSubscribePlus: () => void
}

export function PricingCards({
  plans,
  loggedIn,
  plusActive,
  plusPending,
  razorpayReady,
  subscribing,
  onSubscribePlus,
}: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch">
      {plans.map(plan => {
        const isPlus = plan.slug === 'plus'
        const showSubscribe = isPlus && loggedIn && !plusActive && razorpayReady && !plusPending
        const showSubscribeDisabled = isPlus && loggedIn && !plusActive && !razorpayReady && !plusPending

        return (
          <div key={plan.slug} className="relative">
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0">
                <Badge className="rounded-full border border-teal-400/30 bg-teal-500/15 text-teal-200 text-[10px] uppercase tracking-wider px-3 py-1">
                  {plan.badge}
                </Badge>
              </div>
            )}
            <Card
              className={`h-full rounded-2xl md:rounded-3xl ${
                plan.highlight
                  ? 'border-teal-500/25 bg-gradient-to-b from-teal-500/[0.06] to-transparent shadow-[0_0_0_1px_rgba(45,212,191,0.12)]'
                  : 'border-white/[0.08]'
              }`}
            >
              <CardContent className="p-6 md:p-8 flex flex-col gap-6 h-full">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{plan.eyebrow}</p>
                  <h2 className="text-xl md:text-2xl font-bold text-zinc-100 mt-2">{plan.name}</h2>
                  <div className="mt-5 flex items-baseline gap-2 flex-wrap">
                    <span className="text-4xl md:text-5xl font-bold gradient-text tabular-nums">
                      {plan.monthlyPrice}
                    </span>
                    {plan.pricePeriod && (
                      <span className="text-sm text-zinc-500">{plan.pricePeriod}</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mt-4 leading-relaxed">{plan.description}</p>
                  {isPlus && plusActive && (
                    <p className="text-xs text-teal-400/90 mt-3">Your subscription is active.</p>
                  )}
                  {isPlus && plusPending && (
                    <p className="text-xs text-amber-400/90 mt-3">
                      Payment pending — open checkout again or wait for confirmation.
                    </p>
                  )}
                  {isPlus && loggedIn && !razorpayReady && !plusActive && (
                    <p className="text-xs text-zinc-600 mt-3">Payments are not configured.</p>
                  )}
                  {plan.note && !isPlus && (
                    <p className="text-xs text-zinc-600 mt-3 leading-relaxed">{plan.note}</p>
                  )}
                  {isPlus && plan.note && !plusActive && (
                    <p className="text-xs text-zinc-600 mt-3 leading-relaxed">{plan.note}</p>
                  )}
                </div>

                <ul className="flex flex-col gap-2.5 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature.label} className="flex gap-3 text-sm leading-snug">
                      <span
                        className={`shrink-0 w-5 text-center ${feature.included ? 'text-teal-400' : 'text-zinc-700'}`}
                        aria-hidden
                      >
                        {feature.included ? '✓' : '–'}
                      </span>
                      <span className={feature.included ? 'text-zinc-300' : 'text-zinc-600'}>
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.slug === 'free' && (
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full w-full mt-auto border-white/10 text-zinc-300 hover:bg-white/5"
                  >
                    <TrackedLink
                      href={loggedIn ? '/dashboard' : plan.ctaHref}
                      eventName="upgrade_cta_clicked"
                      eventProperties={{ plan: plan.slug, surface: 'pricing_page' }}
                    >
                      {loggedIn ? 'Continue with Free' : plan.ctaLabel}
                    </TrackedLink>
                  </Button>
                )}

                {isPlus && !loggedIn && (
                  <Button asChild className="rounded-full w-full mt-auto">
                    <TrackedLink
                      href="/sign-up"
                      eventName="sign_up_cta_clicked"
                      eventProperties={{ source: 'pricing_plus' }}
                    >
                      Sign up to subscribe
                    </TrackedLink>
                  </Button>
                )}

                {isPlus && loggedIn && plusActive && (
                  <Button asChild variant="outline" className="rounded-full w-full mt-auto border-white/10">
                    <Link href="/billing">Manage billing</Link>
                  </Button>
                )}

                {isPlus && loggedIn && showSubscribe && (
                  <Button
                    type="button"
                    className="rounded-full w-full mt-auto"
                    disabled={subscribing}
                    onClick={onSubscribePlus}
                  >
                    {subscribing ? 'Opening checkout…' : 'Subscribe to Closr Plus'}
                  </Button>
                )}

                {isPlus && loggedIn && showSubscribeDisabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full w-full mt-auto border-white/10 text-zinc-500"
                    disabled
                  >
                    Subscribe to Closr Plus
                  </Button>
                )}

                {isPlus && loggedIn && plusPending && razorpayReady && (
                  <Button
                    type="button"
                    className="rounded-full w-full mt-auto"
                    disabled={subscribing}
                    onClick={onSubscribePlus}
                  >
                    {subscribing ? 'Opening checkout…' : 'Complete subscription'}
                  </Button>
                )}

                {isPlus && loggedIn && plusPending && !razorpayReady && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full w-full mt-auto border-white/10 text-zinc-500"
                    disabled
                  >
                    Complete subscription
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
