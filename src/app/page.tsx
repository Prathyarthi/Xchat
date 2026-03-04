import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

async function getFeaturedAgents() {
  try {
    return await prisma.agent.findMany({ take: 3, orderBy: { createdAt: 'desc' } })
  } catch {
    return []
  }
}

const FEATURES = [
  { icon: '🧠', title: 'Emotional Intelligence', desc: 'Your companion detects your mood and responds with genuine empathy every time.' },
  { icon: '✨', title: 'Unique Personalities',   desc: 'Each companion has their own voice, backstory, and way of seeing the world.' },
  { icon: '💬', title: 'Deep Conversations',     desc: 'Move beyond small talk. Explore ideas, share feelings, and grow together.' },
  { icon: '🔒', title: 'Always There',           desc: 'No judgement, no schedules. Your companion is ready whenever you need them.' },
]

const PLACEHOLDER_AGENTS = [
  { name: 'Aurora', avatar: '🌸', description: 'A dreamer who finds magic in everyday moments. She loves art, poetry, and late-night philosophy.', interests: ['Art', 'Poetry', 'Philosophy'], tone: 'Romantic' },
  { name: 'Kai',    avatar: '🌊', description: 'An adventurous spirit who has explored every corner of curiosity. Ask him anything.',             interests: ['Science', 'Travel', 'Music'],    tone: 'Intellectual' },
  { name: 'Luna',   avatar: '🌙', description: 'Gentle, wise, and always listening. Luna remembers everything that matters to you.',               interests: ['Books', 'Mindfulness', 'Stars'],  tone: 'Calm' },
]

export default async function LandingPage() {
  const featuredAgents = await getFeaturedAgents()
  const displayAgents = featuredAgents.length > 0 ? featuredAgents : PLACEHOLDER_AGENTS

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
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
              <Link href="/explore">Start Exploring →</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-white/[0.08] text-zinc-400 hover:bg-white/[0.05]">
              <Link href="/agents/create">Create a Companion</Link>
            </Button>
          </div>

          <div className="flex gap-4 justify-center flex-wrap mt-14">
            {[
              { label: 'AI Companions', value: '24+' },
              { label: 'Conversations',  value: '1.2k' },
              { label: 'Happy Users',    value: '500+' },
            ].map(stat => (
              <div key={stat.label} className="glass rounded-2xl px-6 py-4 text-center min-w-[100px]">
                <div className="gradient-text text-2xl font-extrabold">{stat.value}</div>
                <div className="text-[11px] text-zinc-700 mt-1">{stat.label}</div>
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
              Why <span className="gradient-text">XChat</span>?
            </h2>
            <p className="text-zinc-600 text-sm max-w-sm mx-auto">
              Built for humans who want more than a chatbot — a companion that actually gets you.
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

      {/* ── COMPANIONS ── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
              Meet Some <span className="gradient-text">Companions</span>
            </h2>
            <p className="text-zinc-600 text-sm">Every companion has a unique soul. Find the one that speaks to yours.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {displayAgents.map((agent: any, i: number) => {
              let personality: any = {}
              try { personality = JSON.parse(agent.personality || '{}') } catch {}
              const interests: string[] = agent.interests?.length ? agent.interests : PLACEHOLDER_AGENTS[i]?.interests ?? []
              const tone = personality.tone || PLACEHOLDER_AGENTS[i]?.tone || ''

              return (
                <Card key={agent.id || agent.name} className="rounded-2xl">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-zinc-800/60 border border-white/[0.08]">
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
                          <Badge key={interest} variant="outline" className="border-white/[0.1] text-zinc-400 bg-white/[0.04] text-xs rounded-full">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button asChild className="w-full rounded-xl mt-auto" size="sm">
                      <Link href="/explore">Connect →</Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="text-center mt-10">
            <Button asChild variant="outline" className="rounded-full border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] px-8">
              <Link href="/explore">Browse all companions</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-16">
        <div className="max-w-lg mx-auto">
          <Card className="rounded-3xl border-white/[0.08] text-center">
            <CardContent className="p-12">
              <div className="text-5xl mb-5 animate-float">🤖</div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100 mb-3 leading-tight">
                Ready to find your <span className="gradient-text">companion</span>?
              </h2>
              <p className="text-zinc-600 text-sm mb-8 leading-relaxed">
                Join thousands of people who found genuine connection with AI companions built for them.
              </p>
              <Button asChild size="lg" className="rounded-full px-10">
                <Link href="/sign-up">Get Started — It's Free</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] px-6 py-8 text-center">
        <div className="gradient-text text-sm font-bold mb-1">XCHAT</div>
        <div className="text-xs text-zinc-700">AI companions for the human soul.</div>
      </footer>

    </div>
  )
}
