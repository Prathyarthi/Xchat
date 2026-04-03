import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pricingPlans } from '@/lib/pricing'
import { TrackedLink } from '@/components/analytics/tracked-link'

export default function PricingPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold mt-3">
            Pay for better companionship, not just more tokens
          </h1>
          <p className="text-zinc-600 text-sm md:text-base mt-4 leading-relaxed">
            Closr is designed to monetize continuity: deeper memory, more reflections, proactive follow-ups, and room for multiple companions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {pricingPlans.map(plan => (
            <Card
              key={plan.slug}
              className={`rounded-3xl ${plan.highlight ? 'border-white/[0.14]' : 'border-white/8'}`}
            >
              <CardContent className="p-6 md:p-8 flex flex-col gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-700">{plan.eyebrow}</p>
                  <h2 className="text-2xl font-bold text-zinc-100 mt-2">{plan.name}</h2>
                  <p className="text-4xl font-bold gradient-text mt-4">{plan.monthlyPrice}</p>
                  <p className="text-sm text-zinc-600 mt-4 leading-relaxed">{plan.description}</p>
                  {plan.note && <p className="text-xs text-zinc-700 mt-3">{plan.note}</p>}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {plan.features.map(feature => (
                    <div key={feature.label} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/2 px-4 py-3">
                      <span className={feature.included ? 'text-teal-300' : 'text-zinc-700'}>
                        {feature.included ? '✓' : '–'}
                      </span>
                      <span className={feature.included ? 'text-sm text-zinc-300' : 'text-sm text-zinc-600'}>
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>

                <Button asChild className="rounded-full mt-auto">
                  <TrackedLink
                    href={plan.ctaHref}
                    eventName="upgrade_cta_clicked"
                    eventProperties={{ plan: plan.slug }}
                  >
                    {plan.ctaLabel}
                  </TrackedLink>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-3xl">
          <CardContent className="p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Why this packaging works</h2>
              <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                Free gets users into the emotional loop. Plus monetizes continuity: better memory, richer reflections, and proactive care that feels worth paying for.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-white/8 text-zinc-300 hover:bg-white/5">
              <TrackedLink href="/sign-up" eventName="sign_up_cta_clicked" eventProperties={{ source: 'pricing_footer' }}>
                Start free
              </TrackedLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
