export interface PricingFeature {
  label: string
  included: boolean
}

export interface PricingPlan {
  slug: string
  name: string
  eyebrow: string
  description: string
  /** Main price line shown on cards */
  monthlyPrice: string
  /** Shown next to the price, e.g. /month */
  pricePeriod?: string
  ctaLabel: string
  ctaHref: string
  /** On /pricing only — avoids a CTA that points back to the same page */
  pricingPageCta?: { label: string; href: string }
  highlight?: boolean
  badge?: string
  note?: string
  features: PricingFeature[]
}

export const pricingPlans: PricingPlan[] = [
  {
    slug: 'free',
    name: 'Free',
    eyebrow: 'Start the habit',
    description: 'Enough to feel the core loop: two companions, generous journaling, and a taste of daily reflection.',
    monthlyPrice: '₹0',
    pricePeriod: 'forever',
    ctaLabel: 'Start Free',
    ctaHref: '/sign-up',
    features: [
      { label: '2 private companions', included: true },
      { label: '50 messages per month', included: true },
      { label: '200 journal entries per month', included: true },
      { label: 'Limited AI reflections', included: true },
      { label: 'Short memory window', included: true },
      { label: 'Proactive check-ins', included: false },
    ],
  },
  {
    slug: 'plus',
    name: 'Closr Plus',
    eyebrow: 'Continuity unlocked',
    description: 'For people who want a companion that remembers, checks in, and keeps pace with daily life.',
    monthlyPrice: '₹999',
    pricePeriod: '/month',
    ctaLabel: 'See Premium Benefits',
    ctaHref: '/pricing',
    pricingPageCta: { label: 'Get Closr Plus', href: '/sign-up' },
    highlight: true,
    badge: 'Popular',
    note: 'Pay securely with Razorpay. You can cancel from your Razorpay mandate when supported.',
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
