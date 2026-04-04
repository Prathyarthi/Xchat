import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buildActivationSteps, getLifecycleNudge } from '@/lib/onboarding'
import { pricingPlans } from '@/lib/pricing'
import { DashboardSubscribeCta } from '@/features/subscriptions/components/dashboard-subscribe-cta'

const RELATIONSHIP_BADGES: Record<string, { label: string; className: string }> = {
  ROMANTIC: { label: '💕 Romantic', className: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
  BESTIE:   { label: '🤝 Bestie',   className: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  MENTOR:   { label: '🧠 Mentor',   className: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  SUPPORT:  { label: '🫂 Support',  className: 'border-teal-500/40 text-teal-400 bg-teal-500/10' },
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id as string

  const [conversations, createdAgents, journalDayCount, reflectionCount, latestJournalDay] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.agent.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { _count: { select: { conversations: true } } },
    }),
    prisma.journalDay.count({
      where: { userId },
    }),
    prisma.journalDay.count({
      where: {
        userId,
        summary: { not: null },
      },
    }),
    prisma.journalDay.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ])

  const connectedAgentIds = new Set(conversations.map(c => c.agentId))
  const unchattedAgents = createdAgents.filter(a => !connectedAgentIds.has(a.id)).slice(0, 6)
  const activationSteps = buildActivationSteps({
    companionCount: createdAgents.length,
    conversationCount: conversations.length,
    journalDayCount,
    reflectionCount,
    lastConversationAt: conversations[0]?.updatedAt ?? null,
    lastJournalAt: latestJournalDay?.updatedAt ?? null,
  })
  const nextNudge = getLifecycleNudge({
    companionCount: createdAgents.length,
    conversationCount: conversations.length,
    journalDayCount,
    reflectionCount,
    lastConversationAt: conversations[0]?.updatedAt ?? null,
    lastJournalAt: latestJournalDay?.updatedAt ?? null,
  })
  const premiumPlan = pricingPlans.find(plan => plan.slug === 'plus')
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  const plusActive = subscription?.status === 'ACTIVE' && subscription.planSlug === 'plus'

  return (
    <div className="min-h-[calc(100vh-64px)] pb-16 px-4 pt-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-12">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, <span className="gradient-text">{session.user.name}</span>
          </h1>
          <p className="text-zinc-600 text-sm mt-1">Your companions and journal are waiting.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/journal">Open Journal</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full border-white/8 text-zinc-300 hover:bg-white/5">
              <Link href="/pricing">See plans</Link>
            </Button>
          </div>
        </div>

        <DashboardSubscribeCta />

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5">
          <Card className="rounded-3xl">
            <CardContent className="p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Activation checklist</h2>
                  <p className="text-sm text-zinc-600 mt-1">
                    The fastest path to value is first chat, first journal entry, and first AI reflection.
                  </p>
                </div>
                <div className="rounded-full border border-white/8 px-3 py-1 text-xs text-zinc-400">
                  {activationSteps.filter(step => step.completed).length}/{activationSteps.length} complete
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activationSteps.map(step => (
                  <Link
                    key={step.title}
                    href={step.href}
                    className={`rounded-2xl border p-4 transition ${
                      step.completed
                        ? 'border-teal-500/30 bg-teal-500/8'
                        : 'border-white/8 bg-white/3 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-sm text-zinc-100">{step.title}</p>
                      <span className="text-xs text-zinc-400">{step.completed ? 'Done' : 'Next'}</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{step.description}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardContent className="p-6 flex flex-col gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-700">Lifecycle nudge</p>
                <h2 className="text-lg font-bold text-zinc-100 mt-2">
                  {nextNudge?.title ?? 'You are in the habit loop'}
                </h2>
                <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                  {nextNudge?.body ?? 'You have already crossed the first-value milestones. Keep returning to deepen memory and reflection.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <p className="text-xl font-bold gradient-text">{conversations.length}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">conversations</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <p className="text-xl font-bold gradient-text">{journalDayCount}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">journal days</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <p className="text-xl font-bold gradient-text">{reflectionCount}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">AI reflections</p>
                </div>
              </div>

              {nextNudge && (
                <Button asChild className="rounded-full">
                  <Link href={nextNudge.href}>{nextNudge.cta}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </section>

        {premiumPlan && !plusActive && (
          <section>
            <Card className="rounded-3xl border-white/10">
              <CardContent className="p-6 md:p-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-700">{premiumPlan.eyebrow}</p>
                  <h2 className="text-2xl font-bold text-zinc-100 mt-2">
                    Upgrade when you want deeper memory and proactive check-ins
                  </h2>
                  <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                    {premiumPlan.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {premiumPlan.features.slice(0, 4).map(feature => (
                      <Badge key={feature.label} variant="outline" className="border-white/8 text-zinc-400 rounded-full">
                        {feature.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="md:text-right">
                  <div className="flex items-baseline gap-2 justify-end flex-wrap">
                    <p className="text-3xl font-bold gradient-text tabular-nums">{premiumPlan.monthlyPrice}</p>
                    {premiumPlan.pricePeriod && (
                      <span className="text-sm text-zinc-500">{premiumPlan.pricePeriod}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">Billed via Razorpay</p>
                  <Button asChild className="rounded-full mt-4">
                    <Link href="/pricing">Compare plans</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {plusActive && (
          <section>
            <Card className="rounded-3xl border-teal-500/20 bg-teal-500/[0.04]">
              <CardContent className="p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-teal-500/80">Closr Plus</p>
                  <h2 className="text-xl font-bold text-zinc-100 mt-2">You have full continuity unlocked</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Higher limits and proactive features are active on your account.
                  </p>
                </div>
                <Button asChild variant="outline" className="rounded-full border-white/10 shrink-0">
                  <Link href="/billing">Billing</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* My Companions */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-zinc-100">My Companions</h2>
            <Button asChild variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300 rounded-full">
              <Link href="/explore">Find more →</Link>
            </Button>
          </div>

          {conversations.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="font-bold text-zinc-200 text-lg mb-2">No companions yet</h3>
              <p className="text-zinc-600 text-sm mb-6">Start a conversation with someone amazing.</p>
              <Button asChild className="rounded-full">
                <Link href="/agents/create">Create your first companion →</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conversations.map(conv => {
                const agent = conv.agent as any
                const lastMsg = conv.messages[0]
                const badge = agent.relationshipType ? RELATIONSHIP_BADGES[agent.relationshipType] : null
                return (
                  <Card key={conv.id} className="rounded-3xl">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl bg-zinc-800/60 border border-white/8">
                        {agent.avatar || '✨'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-zinc-100 text-sm">{agent.name}</p>
                          {badge && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        {lastMsg ? (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">{lastMsg.content}</p>
                        ) : (
                          <p className="text-xs text-zinc-700 mt-0.5">No messages yet</p>
                        )}
                        {lastMsg && (
                          <p className="text-xs text-zinc-700 mt-0.5">{timeAgo(new Date(lastMsg.createdAt))}</p>
                        )}
                      </div>
                      <Button asChild size="sm" variant="ghost" className="text-zinc-400 hover:text-zinc-100 rounded-xl shrink-0">
                        <Link href={`/chat/${conv.id}`}>Continue →</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {unchattedAgents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-zinc-100">Discover</h2>
              <Button asChild variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300 rounded-full">
                <Link href="/explore">See all →</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unchattedAgents.map(agent => {
                const badge = (agent as any).relationshipType ? RELATIONSHIP_BADGES[(agent as any).relationshipType] : null
                let personality: any = {}
                try { personality = JSON.parse((agent as any).personality || '{}') } catch {}
                return (
                  <Card key={agent.id} className="rounded-3xl">
                    <CardContent className="p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-xl bg-zinc-800/60 border border-white/8">
                          {agent.avatar || '✨'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-zinc-100 text-sm">{agent.name}</p>
                          {badge && (
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-0.5 ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2">{agent.description}</p>
                      <Button asChild size="sm" className="rounded-xl w-full">
                        <Link href={`/agents/${agent.id}`}>View Profile</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
