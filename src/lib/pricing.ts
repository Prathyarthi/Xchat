export interface PricingFeature {
  label: string
  included: boolean
}

export interface PricingPlan {
  slug: string
  name: string
  eyebrow: string
  description: string
  monthlyPrice: string
  ctaLabel: string
  ctaHref: string
  highlight?: boolean
  note?: string
  features: PricingFeature[]
}

export const pricingPlans: PricingPlan[] = [
  {
    slug: 'free',
    name: 'Free',
    eyebrow: 'Start the habit',
    description: 'Enough to feel the core loop: one companion, private journaling, and a taste of daily reflection.',
    monthlyPrice: '$0',
    ctaLabel: 'Start Free',
    ctaHref: '/sign-up',
    features: [
      { label: '1 private companion', included: true },
      { label: 'Basic chat allowance', included: true },
      { label: 'Private journal entries', included: true },
      { label: 'Limited AI reflections', included: true },
      { label: 'Short memory window', included: true },
      { label: 'Proactive check-ins', included: false },
    ],
  },
  {
    slug: 'plus',
    name: 'Closr Plus',
    eyebrow: 'Continuity unlocked',
    description: 'Best for people who want an AI companion that remembers, checks in, and keeps pace with daily life.',
    monthlyPrice: '$12/mo',
    ctaLabel: 'See Premium Benefits',
    ctaHref: '/pricing',
    highlight: true,
    note: 'Target pricing from the GTM plan. Billing setup can be connected later.',
    features: [
      { label: 'Multiple companions', included: true },
      { label: 'Higher chat allowance', included: true },
      { label: 'Deeper long-term memory', included: true },
      { label: 'Unlimited AI reflections', included: true },
      { label: 'Proactive follow-up messages', included: true },
      { label: 'Priority response quality', included: true },
    ],
  },
]

export const heroProofPoints = [
  'Remembers your story',
  'Tracks emotional tone',
  'Reflects on your day',
  'Follows up later',
]
