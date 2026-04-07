'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/components/auth-provider'
import { emotionConfig, type Emotion } from '@/lib/emotion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface Message {
  id: string
  senderType: 'HUMAN' | 'AGENT'
  content: string
  emotion: string | null
  createdAt: string
}

interface Agent {
  id: string
  name: string
  description: string
  personality: string
  interests: string[]
  avatar: string | null
}

interface Conversation {
  id: string
  agent: Agent
  messages: Message[]
  agentAvailableAt: string | null
}

interface LimitUsage {
  used: number
  limit: number
  remaining: number
}

function TypingIndicator({ agentAvatar }: { agentAvatar: string }) {
  return (
    <div className="flex items-end gap-3">
      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm bg-zinc-800/60 border border-white/8">
        {agentAvatar}
      </div>
      <div className="bubble-agent px-4 py-3 flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500"
            style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message, userAvatar, agentAvatar, showSeen }: {
  message: Message; userAvatar: string; agentAvatar: string; showSeen?: boolean;
}) {
  const isHuman = message.senderType === 'HUMAN'
  const emotion = message.emotion as Emotion | null
  const emotionMeta = emotion && emotion !== 'neutral' ? emotionConfig[emotion] : null

  return (
    <div className={`flex items-end gap-3 ${isHuman ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold border ${
        isHuman ? 'bg-zinc-700 border-white/10' : 'bg-zinc-800/60 border-white/8'
      }`}>
        {isHuman ? userAvatar : agentAvatar}
      </div>
      <div className={`max-w-[70%] md:max-w-[60%] ${isHuman ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 text-sm leading-relaxed ${isHuman ? 'bubble-human' : 'bubble-agent'}`}>
          {message.content}
        </div>
        <div className={`max-w-[70%] md:max-w-[60%] ${isHuman ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
          <div className={`px-4 py-3 text-sm leading-relaxed ${isHuman ? 'bubble-human' : 'bubble-agent'}`}>
            {message.content}
          </div>
          {emotionMeta && (
            <div className="flex items-center gap-1 px-2">
              <span className="text-xs">{emotionMeta.emoji}</span>
              <span className="text-[10px]" style={{ color: emotionMeta.color }}>{emotionMeta.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Seen indicator — only rendered under the last human message while seen=true */}
      {isHuman && showSeen && (
        <div className="mt-1 pr-11 animate-fade-in">
          <span className="text-[10px] text-zinc-500">Seen</span>
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  const { conversationId } = useParams() as { conversationId: string }
  const { user } = useAuth()
  const router = useRouter()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [seen, setSeen] = useState(false)       // "Seen" visible under last human message
  const [typing, setTyping] = useState(false)   // agent typing indicator visible
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messageUsage, setMessageUsage] = useState<LimitUsage | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/messages`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.conversation) {
          setConversation({ ...data.conversation, agentAvailableAt: data.conversation.agentAvailableAt ?? null })
          setMessages(data.conversation.messages)
          setMessageUsage(data.messageUsage ?? null)
        } else {
          router.push('/explore')
        }
      })
      .finally(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, seen, typing])

  const calcTypingDelay = (text: string): number => {
    const thinkMs = 0.5 + Math.random() * 0.5 // 0.5sec - 1sec
    const typeMs = (text.length / 20) * 1000
    return Math.min(7000, Math.max(800, thinkMs + typeMs))
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || !conversation) return
    setLimitError(null)
    const optimistic: Message = { id: `optimistic-${Date.now()}`, senderType: 'HUMAN', content: text, emotion: null, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setInput('')
    setSending(true)
    setSeen(false)
    setTyping(false)

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId, message: text }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessageUsage(data.messageUsage ?? null)
        if (data.agentAvailableAt !== undefined) {
          setConversation(prev => prev ? { ...prev, agentAvailableAt: data.agentAvailableAt } : prev)
        }

        if (!data.agentAway && data.message?.content) {
          const typingDelay = calcTypingDelay(data.message.content)

          // Step 1 — API responded, agent has "read" the message → show Seen
          setSeen(true)

          // Step 2 — short pause so user sees "Seen", then agent starts typing → Seen disappears
          await new Promise(resolve => setTimeout(resolve, 1200))
          setSeen(false)
          setTyping(true)

          // Step 3 — typing plays out for a realistic duration
          await new Promise(resolve => setTimeout(resolve, typingDelay))

          // Step 4 — agent message renders, typing stops
          setTyping(false)
        }

        setMessages(prev => {
          const without = prev.filter(m => m.id !== optimistic.id)
          const humanMsg: Message = {
            ...optimistic,
            id: `human-${Date.now()}`,
            emotion: data.userEmotion || null,
          }
          return data.message ? [...without, humanMsg, data.message] : [...without, humanMsg]
        })
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setLimitError(data.error || 'Unable to send message right now.')
        setMessageUsage(data.messageUsage ?? null)
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSeen(false)
      setTyping(false)
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-float">💬</div>
          <p className="text-zinc-600 text-sm">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!conversation) return null

  const agent = conversation.agent
  let personality: any = {}
  try { personality = JSON.parse(agent.personality || '{}') } catch {}
  const agentAvatar = agent.avatar || '✨'
  const userAvatar = user?.avatar || (user?.name?.[0]?.toUpperCase() ?? '?')
  const isAgentAway = conversation.agentAvailableAt
    ? new Date(conversation.agentAvailableAt) > new Date()
    : false
  const hasMessageLimitReached = Boolean(messageUsage && messageUsage.remaining <= 0)

  // Index of the last human message (to attach "Seen" only to it)
  const lastHumanIndex = messages.reduce((acc, m, i) => m.senderType === 'HUMAN' ? i : acc, -1)

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full px-4 py-4 gap-4">

        <aside className={`
          ${sidebarOpen ? 'fixed inset-0 z-40 bg-[#080b14] pt-4 px-4' : 'hidden'}
          lg:flex lg:static lg:z-auto lg:bg-transparent lg:pt-0 lg:px-0
          lg:w-72 lg:shrink-0 flex-col gap-4
        `}>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden self-end text-zinc-500 hover:text-zinc-200 mb-2 text-sm">
              ✕ Close
            </button>
          )}

          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 animate-pulse-ring bg-zinc-800/60 border border-white/8">
                {agentAvatar}
              </div>
              <h2 className="font-bold text-zinc-100 text-base">{agent.name}</h2>
              {personality.tone && <p className="text-xs text-zinc-500 mt-0.5">{personality.tone}</p>}
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed text-center">{agent.description}</p>

            {personality.traits?.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">Personality</p>
                <div className="flex flex-wrap gap-1.5">
                  {personality.traits.map((t: string) => (
                    <Badge key={t} variant="outline" className="border-white/8 text-zinc-600 text-xs rounded-full">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {agent.interests?.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.interests.map(interest => (
                    <Badge key={interest} variant="outline" className="border-white/10 text-zinc-400 bg-white/4 text-xs rounded-full">{interest}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-3 border-t border-white/6">
              <p className="text-xl font-bold gradient-text">{messages.length}</p>
              <p className="text-xs text-zinc-700">messages exchanged</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-3">Free plan usage</p>
            {messageUsage ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                  <p className="text-xs text-zinc-400">{messageUsage.used}/{messageUsage.limit} messages this month</p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {messageUsage.remaining > 0
                      ? `${messageUsage.remaining} free messages left`
                      : 'Free limit reached'}
                  </p>
                </div>
                {hasMessageLimitReached && (
                  <Button asChild size="sm" className="rounded-full">
                    <Link href="/pricing">Upgrade to keep chatting</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(emotionConfig).filter(([k]) => k !== 'neutral').slice(0, 6).map(([, v]) => (
                  <div key={v.label} className="flex items-center gap-1.5">
                    <span className="text-xs">{v.emoji}</span>
                    <span className="text-[10px] text-zinc-600">{v.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 bg-zinc-800/60 border border-white/8">
              {agentAvatar}
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">{agent.name}</h3>
              <div className="flex items-center gap-1.5">
                {isAgentAway
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-xs text-amber-400">Away</span></>
                  : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-emerald-400">Online</span></>
                }
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {limitError && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="text-sm text-amber-200">{limitError}</p>
                {hasMessageLimitReached && (
                  <div className="mt-3">
                    <Button asChild size="sm" className="rounded-full">
                      <Link href="/pricing">See paid plan</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
            {messages.length === 0 && !sending ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="text-5xl mb-4 animate-float">{agentAvatar}</div>
                <h3 className="font-bold text-zinc-200 text-base mb-2">Say hello to {agent.name}</h3>
                <p className="text-zinc-600 text-sm max-w-xs">{agent.description.slice(0, 100)}...</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  userAvatar={userAvatar}
                  agentAvatar={agentAvatar}
                  // Show "Seen" only under the last human message while seen=true
                  showSeen={seen && idx === lastHumanIndex}
                />
              ))
            )}
            {typing && <TypingIndicator agentAvatar={agentAvatar} />}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-3 border-t border-white/6">
            <div className="flex gap-2 items-end">
              <Textarea ref={inputRef} className="flex-1 resize-none min-h-[44px] max-h-32 py-2.5"
                placeholder={`Message ${agent.name}...`} rows={1} value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={sending || hasMessageLimitReached} />
              <Button onClick={handleSend} disabled={!input.trim() || sending || hasMessageLimitReached}
                size="icon" className="h-11 w-11 shrink-0 rounded-xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </Button>
            </div>
            <p className="text-[10px] text-zinc-700 mt-1.5 text-center">
              {messageUsage
                ? `${messageUsage.used}/${messageUsage.limit} free messages used this month`
                : 'Enter to send · Shift+Enter for new line'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}