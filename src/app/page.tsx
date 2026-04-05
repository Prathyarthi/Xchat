import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { heroProofPoints, pricingPlans } from '@/lib/pricing'

async function getFeaturedAgents(userId?: string) {
  if (!userId) return []

  try {
    return await prisma.agent.findMany({
      where: { creatorId: userId },
      take: 3,
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}

const FEATURES = [
  { icon: '🧠', title: 'Memory That Builds', desc: 'Closr keeps context between conversations so the relationship feels cumulative instead of disposable.' },
  { icon: '🫶', title: 'Emotion-Aware Replies', desc: 'Messages can respond to mood and relationship style, making support feel more personal.' },
  { icon: '🗓️', title: 'Daily Reflection Loop', desc: 'Journal days and AI reflections turn private thoughts into an everyday habit.' },
  { icon: '📨', title: 'Follow-Up Energy', desc: 'Scheduled messages and check-ins create a sense of continuity that most chat apps never reach.' },
]

export default async function LandingPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string | undefined
  const featuredAgents = await getFeaturedAgents(userId)

  return (
    <div className="overflow-x-hidden">
      <section className="relative pt-24 pb-20 px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-xs mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse-ring inline-block" />
            AI companions that truly understand you
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6" style={{ letterSpacing: '-0.02em' }}>
            Find Your{' '}
            <span className="gradient-text">Perfect</span>
            <br />AI Companion
          </h1>

          <p className="text-zinc-600 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            Connect with AI companions that remember your stories, feel your emotions, and grow with you over time.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild size="lg" className="rounded-full px-8">
              <TrackedLink href="/sign-up" eventName="sign_up_cta_clicked" eventProperties={{ source: 'hero_primary' }}>
                Start Free
              </TrackedLink>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-white/8 text-zinc-400 hover:bg-white/5">
              <TrackedLink href="/pricing" eventName="pricing_cta_clicked" eventProperties={{ source: 'hero_secondary' }}>
                Subscribe
              </TrackedLink>
            </Button>
          </div>

          <div className="flex gap-3 justify-center flex-wrap mt-14">
            {heroProofPoints.map(label => (
              <div key={label} className="glass rounded-full px-4 py-2 text-center">
                <div className="text-xs text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
              Why <span className="gradient-text">Closr</span>?
            </h2>
            <p className="text-zinc-600 text-sm max-w-sm mx-auto">
              Built for people who want more than a chatbot: private support, daily reflection, and a companion that stays coherent over time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(f => (
              <Card key={f.title} className="rounded-2xl">
                <CardContent className="p-6">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="text-sm font-bold text-zinc-200 mb-2">{f.title}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {featuredAgents.length > 0 && (
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
                Your Recent <span className="gradient-text">Companions</span>
              </h2>
              <p className="text-zinc-600 text-sm">Companions are built to connect with you.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featuredAgents.map((agent: any) => {
                let personality: any = {}
                try { personality = JSON.parse(agent.personality || '{}') } catch { }
                const interests: string[] = agent.interests?.length ? agent.interests : []
                const tone = personality.tone || ''

                return (
                  <Card key={agent.id} className="rounded-2xl">
                    <CardContent className="p-6 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-zinc-800/60 border border-white/8">
                          {agent.avatar || '✨'}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-100">{agent.name}</div>
                          {tone && <div className="text-xs text-zinc-500 mt-0.5">{tone}</div>}
                        </div>
                      </div>

                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">{agent.description}</p>

                      {interests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {interests.slice(0, 3).map((interest: string) => (
                            <Badge key={interest} variant="outline" className="border-white/10 text-zinc-400 bg-white/4 text-xs rounded-full">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Button asChild className="w-full rounded-xl mt-auto" size="sm">
                        <Link href={`/agents/${agent.id}`}>Connect →</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="text-center mt-10">
              <Button asChild variant="outline" className="rounded-full border-white/8 text-zinc-400 hover:bg-white/5 px-8">
                <Link href="/explore">View all your companions</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
              <span className="gradient-text">Pricing</span>
            </h2>
            <p className="text-zinc-600 text-sm max-w-xl mx-auto">
              Two plans: start free, or upgrade to Plus for deeper memory, richer reflections, and proactive follow-ups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pricingPlans.map(plan => (
              <Card
                key={plan.slug}
                className={`rounded-3xl relative ${plan.highlight ? 'border-teal-500/20 shadow-[0_0_0_1px_rgba(45,212,191,0.1)]' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-2.5 right-4">
                    <Badge className="rounded-full border border-teal-400/30 bg-teal-500/15 text-teal-200 text-[10px] uppercase tracking-wider">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-700">{plan.eyebrow}</p>
                    <h3 className="text-2xl font-bold text-zinc-100 mt-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 flex-wrap mt-3">
                      <p className="text-3xl font-bold gradient-text tabular-nums">{plan.monthlyPrice}</p>
                      {plan.pricePeriod && (
                        <span className="text-sm text-zinc-500">{plan.pricePeriod}</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {plan.features.slice(0, 4).map(feature => (
                      <div key={feature.label} className="text-sm text-zinc-400">
                        {feature.included ? '✓' : '–'} {feature.label}
                      </div>
                    ))}
                  </div>

                  <Button asChild variant={plan.highlight ? 'default' : 'outline'} className="rounded-full mt-auto border-white/8 text-zinc-500 hover:bg-white/5">
                    <TrackedLink href={plan.ctaHref} eventName="pricing_cta_clicked" eventProperties={{ plan: plan.slug, source: 'homepage_pricing' }}>
                      {plan.ctaLabel}
                    </TrackedLink>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-16">
        <div className="max-w-lg mx-auto">
          <Card className="rounded-3xl border-white/8 text-center">
            <CardContent className="p-12">
              <div className="text-5xl mb-5 animate-float">💗</div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100 mb-3 leading-tight">
                Ready to build your <span className="gradient-text">daily support loop</span>?
              </h2>
              <p className="text-zinc-600 text-sm mb-8 leading-relaxed">
                Start with one companion, one conversation, and one journal day. That is enough to feel what makes Closr different.
              </p>
              <Button asChild size="lg" className="rounded-full px-10">
                <TrackedLink href="/sign-up" eventName="sign_up_cta_clicked" eventProperties={{ source: 'footer_cta' }}>
                  Get Started For Free
                </TrackedLink>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-white/6 px-6 py-8 text-center">
        <div className="gradient-text text-sm font-bold mb-1">Closr</div>
        <div className="text-xs text-zinc-700">Private AI companionship with memory, reflection, and emotional continuity.</div>
        <div className="flex justify-center gap-4 mt-4 text-xs text-zinc-600">
          <Link href="/pricing">Subscribe</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/safety">Safety</Link>
        </div>
      </footer>

    </div>
  )
}
