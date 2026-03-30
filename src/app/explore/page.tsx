'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/features/auth/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface Agent {
  id: string
  name: string
  description: string
  personality: string
  interests: string[]
  avatar: string | null
  relationshipType: string | null
  _count: { conversations: number }
}

const RELATIONSHIP_BADGES: Record<string, { label: string; className: string }> = {
  ROMANTIC: { label: '💕 Romantic', className: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
  BESTIE: { label: '🤝 Bestie', className: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  MENTOR: { label: '🧠 Mentor', className: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  SUPPORT: { label: '🫂 Support', className: 'border-teal-500/40 text-teal-400 bg-teal-500/10' },
}

function AgentCard({ agent }: { agent: Agent }) {
  let personality: any = {}
  try { personality = JSON.parse(agent.personality || '{}') } catch { }

  const badge = agent.relationshipType ? RELATIONSHIP_BADGES[agent.relationshipType] : null

  return (
    <Card className="rounded-3xl flex flex-col gap-0 py-0 overflow-hidden">
      <CardContent className="p-6 flex flex-col gap-4 h-full">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl bg-zinc-800/60 border border-white/[0.08]">
            {agent.avatar || '✨'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-zinc-100 text-base leading-tight">{agent.name}</h3>
            {badge && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-1 ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3 flex-1">
          {agent.description}
        </p>

        {personality.traits?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {personality.traits.slice(0, 3).map((trait: string) => (
              <Badge key={trait} variant="outline" className="border-white/[0.08] text-zinc-600 text-xs rounded-full">
                {trait}
              </Badge>
            ))}
          </div>
        )}

        {agent.interests?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.interests.slice(0, 4).map((interest: string) => (
              <Badge key={interest} variant="outline" className="border-white/[0.1] text-zinc-400 bg-white/[0.04] text-xs rounded-full">
                {interest}
              </Badge>
            ))}
          </div>
        )}

        <Button asChild className="w-full mt-auto rounded-xl">
          <Link href={`/agents/${agent.id}`}>View Profile</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ExplorePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (authLoading || !user) return

    fetch('/api/agents', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setAgents(data.agents || []))
      .finally(() => setLoading(false))
  }, [authLoading, user])

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push('/sign-in')
    }
  }, [authLoading, router, user])

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase()) ||
    a.interests?.some(i => i.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-[calc(100vh-64px)] pb-16 px-4 pt-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Find Your <span className="gradient-text">Companion</span>
          </h1>
          <p className="text-zinc-600 max-w-lg mx-auto text-sm">
            Browse companions built for continuity: distinct personalities, emotional tone, and conversations that can grow over time.
          </p>
        </div>

        <div className="max-w-md mx-auto mb-10">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <Input type="text" className="pl-9" placeholder="Search by name, interest, or personality..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-3xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-zinc-200 mb-2">
              {agents.length === 0 ? 'No companions yet' : 'No results found'}
            </h3>
            <p className="text-zinc-600 mb-6 text-sm">
              {agents.length === 0 ? 'Be the first to create an AI companion!' : 'Try a different search term'}
            </p>
            {agents.length === 0 && (
              <Button asChild className="rounded-full">
                <a href="/agents/create">Create a Companion</a>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
