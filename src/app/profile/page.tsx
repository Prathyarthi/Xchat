'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/features/auth/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const AVATARS = ['🌸', '🌊', '🌙', '⚡', '🦋', '🌿', '🔥', '🌟', '🎭', '🦁', '🐺', '🦊']

interface Conversation {
  id: string
  agent: { id: string; name: string; avatar: string | null }
  messages: Array<{ content: string; senderType: string; createdAt: string }>
  updatedAt: string
}

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convLoading, setConvLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', avatar: '' })

  useEffect(() => {
    if (!authLoading && !user) router.push('/sign-in')
  }, [user, authLoading])

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, bio: (user as any).bio || '', avatar: user.avatar || '🌸' })
      fetch(`/api/users/${user.id}/conversations`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => setConversations(data.conversations || []))
        .finally(() => setConvLoading(false))
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      if (res.ok) setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-4xl animate-float">✨</div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] pb-16 px-4 pt-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Your <span className="gradient-text">Profile</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <Card className="rounded-2xl">
              <CardContent className="p-6 flex flex-col gap-5">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-4xl animate-pulse-ring bg-zinc-800/60 border border-white/[0.08]">
                    {editing ? form.avatar : (user.avatar || '🌸')}
                  </div>

                  {editing && (
                    <div className="grid grid-cols-6 gap-1.5 mb-4">
                      {AVATARS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, avatar: emoji }))}
                          className={`h-8 rounded-lg text-base ${
                            form.avatar === emoji
                              ? 'bg-white/[0.1] border border-white/25'
                              : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07]'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {editing ? (
                    <Input className="text-center text-base font-bold mb-1"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name" />
                  ) : (
                    <h2 className="font-bold text-zinc-100 text-lg">{user.name}</h2>
                  )}
                  <p className="text-xs text-zinc-600 mt-0.5">{user.role.toLowerCase()}</p>
                  <p className="text-xs text-zinc-700 mt-0.5">{user.email}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>About</Label>
                  {editing ? (
                    <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell your companions about yourself..." className="resize-none min-h-[72px]" />
                  ) : (
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {form.bio || <span className="text-zinc-700 italic">No bio yet</span>}
                    </p>
                  )}
                </div>

                <Separator className="bg-white/[0.06]" />

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold gradient-text">{conversations.length}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Companions</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold gradient-text">
                      {conversations.reduce((sum, c) => sum + c.messages.length, 0)}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Messages</p>
                  </div>
                </div>

                {editing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}
                      className="flex-1 border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] rounded-full">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 rounded-full">
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}
                      className="flex-1 border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] rounded-full">
                      Edit Profile
                    </Button>
                    <Button variant="outline" size="sm" onClick={logout}
                      className="flex-1 border-white/[0.08] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full">
                      Sign Out
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-zinc-200 text-base">Your Conversations</h2>
              <Button variant="outline" size="sm" asChild
                className="border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] rounded-full">
                <Link href="/explore">+ Find new</Link>
              </Button>
            </div>

            {convLoading ? (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass rounded-2xl h-20 animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-10 text-center">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-zinc-600 text-sm mb-4">No conversations yet</p>
                  <Button asChild className="rounded-full">
                    <Link href="/explore">Find a Companion</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {conversations.map(conv => {
                  const lastMsg = conv.messages[0]
                  return (
                    <Link key={conv.id} href={`/chat/${conv.id}`}
                      className="glass-card rounded-2xl px-4 py-3 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xl bg-zinc-800/60 border border-white/[0.08]">
                        {conv.agent.avatar || '✨'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-zinc-200 text-sm">{conv.agent.name}</p>
                          <span className="text-[10px] text-zinc-700 flex-shrink-0">
                            {new Date(conv.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {lastMsg && (
                          <p className="text-xs text-zinc-600 mt-0.5 truncate">
                            {lastMsg.senderType === 'HUMAN' ? 'You: ' : `${conv.agent.name}: `}
                            {lastMsg.content}
                          </p>
                        )}
                      </div>
                      <svg className="text-zinc-700 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
