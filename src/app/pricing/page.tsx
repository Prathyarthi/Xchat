import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { SubscriptionFlow } from '@/features/subscriptions/components/subscription-flow'

export default function PricingPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-14 md:py-20">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-50">
            Two simple plans
          </h1>
          <p className="text-zinc-500 text-sm md:text-base leading-relaxed">
            Pick where you want to start. Free proves the loop; Plus unlocks memory, reflection, and follow-ups that feel continuous.
          </p>
        </header>

        <SubscriptionFlow />

        <Card className="rounded-2xl md:rounded-3xl border-white/[0.06] bg-white/[0.02]">
          <CardContent className="p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold text-zinc-100">Why only two plans?</h2>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Free is for discovering the habit. Plus is for people who want the product to feel like a relationship that lasts — not a metered chat quota. We will keep the lineup this simple until usage tells us we need more.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-white/10 text-zinc-300 hover:bg-white/5 shrink-0">
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
