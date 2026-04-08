import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import ConnectButton from './connect-button'

const RELATIONSHIP_BADGES: Record<string, { label: string; className: string }> = {
  BESTIE:   { label: '🤝 Bestie',   className: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  MENTOR:   { label: '🧠 Mentor',   className: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  SUPPORT:  { label: '🫂 Support',  className: 'border-teal-500/40 text-teal-400 bg-teal-500/10' },
  ROMANTIC: { label: '💕 Romantic', className: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
}

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/sign-in')

  const agent = await prisma.agent.findFirst({
    where: {
      id,
      OR: [{ creatorId: null }, { creatorId: session.user.id as string }],
    },
  })

  if (!agent) notFound()

  let personality: {
    traits?: string[]
    communicationStyle?: string
    tone?: string
    backstory?: string
  } = {}
  try { personality = JSON.parse(agent.personality || '{}') } catch {}

  const badge = (agent as any).relationshipType ? RELATIONSHIP_BADGES[(agent as any).relationshipType] : null

  return (
    <div className="min-h-[calc(100vh-64px)] pb-16 px-4 pt-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl bg-zinc-800/60 border border-white/8 shadow-xl">
            {agent.avatar || '✨'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">{agent.name}</h1>
            {badge && (
              <span className={`inline-block text-sm px-3 py-1 rounded-full border mt-2 ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>

        {/* About */}
        <Card className="rounded-3xl">
          <CardContent className="p-6 flex flex-col gap-5">
            <div>
              <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">About</p>
              <p className="text-zinc-400 text-sm leading-relaxed">{agent.description}</p>
            </div>

            {personality.backstory && (
              <div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">Background</p>
                <p className="text-zinc-400 text-sm leading-relaxed">{personality.backstory}</p>
              </div>
            )}

            {personality.traits && personality.traits.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">Personality</p>
                <div className="flex flex-wrap gap-2">
                  {personality.traits.map((trait: string) => (
                    <Badge key={trait} variant="outline" className="border-white/[0.1] text-zinc-400 bg-white/[0.04] rounded-full">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {agent.interests && agent.interests.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {agent.interests.map((interest: string) => (
                    <Badge key={interest} variant="outline" className="border-white/[0.08] text-zinc-500 rounded-full">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(personality.tone || personality.communicationStyle) && (
              <div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">Style</p>
                <p className="text-zinc-500 text-sm">
                  {[personality.tone, personality.communicationStyle].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <ConnectButton agentId={agent.id} agentName={agent.name} />
      </div>
    </div>
  )
}
