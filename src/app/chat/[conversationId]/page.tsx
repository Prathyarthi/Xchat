'use client'

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

function TypingIndicator({ agentAvatar }: { agentAvatar: string }) {
  return (
    <div className="flex items-end gap-3">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm bg-zinc-800/60 border border-white/[0.08]">
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

function MessageBubble({ message, userAvatar, agentAvatar }: {
  message: Message; userAvatar: string; agentAvatar: string
}) {
  const isHuman = message.senderType === 'HUMAN'
  const emotion = message.emotion as Emotion | null
  const emotionMeta = emotion && emotion !== 'neutral' ? emotionConfig[emotion] : null

  return (
    <div className={`flex items-end gap-3 ${isHuman ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border ${
        isHuman ? 'bg-zinc-700 border-white/[0.1]' : 'bg-zinc-800/60 border-white/[0.08]'
      }`}>
        {isHuman ? userAvatar : agentAvatar}
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
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/messages`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.conversation) {
          setConversation({ ...data.conversation, agentAvailableAt: data.conversation.agentAvailableAt ?? null })
          setMessages(data.conversation.messages)
        } else {
          router.push('/explore')
        }
      })
      .finally(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || !conversation) return
    const optimistic: Message = { id: `optimistic-${Date.now()}`, senderType: 'HUMAN', content: text, emotion: null, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId, message: text }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.agentAvailableAt !== undefined) {
          setConversation(prev => prev ? { ...prev, agentAvailableAt: data.agentAvailableAt } : prev)
        }
        setMessages(prev => {
          const without = prev.filter(m => m.id !== optimistic.id)
          const humanMsg: Message = { ...optimistic, id: `human-${Date.now()}`, emotion: data.userEmotion || null }
          return data.message ? [...without, humanMsg, data.message] : [...without, humanMsg]
        })
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
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

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full px-4 py-4 gap-4">

        <aside className={`
          ${sidebarOpen ? 'fixed inset-0 z-40 bg-[#080b14] pt-4 px-4' : 'hidden'}
          lg:flex lg:static lg:z-auto lg:bg-transparent lg:pt-0 lg:px-0
          lg:w-72 lg:flex-shrink-0 flex-col gap-4
        `}>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden self-end text-zinc-500 hover:text-zinc-200 mb-2 text-sm">
              ✕ Close
            </button>
          )}

          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 animate-pulse-ring bg-zinc-800/60 border border-white/[0.08]">
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
                    <Badge key={t} variant="outline" className="border-white/[0.08] text-zinc-600 text-xs rounded-full">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {agent.interests?.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.interests.map(interest => (
                    <Badge key={interest} variant="outline" className="border-white/[0.1] text-zinc-400 bg-white/[0.04] text-xs rounded-full">{interest}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-3 border-t border-white/[0.06]">
              <p className="text-xl font-bold gradient-text">{messages.length}</p>
              <p className="text-xs text-zinc-700">messages exchanged</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-3">Emotion Tracker</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(emotionConfig).filter(([k]) => k !== 'neutral').slice(0, 6).map(([, v]) => (
                <div key={v.label} className="flex items-center gap-1.5">
                  <span className="text-xs">{v.emoji}</span>
                  <span className="text-[10px] text-zinc-600">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-zinc-800/60 border border-white/[0.08]">
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
            {messages.length === 0 && !sending ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="text-5xl mb-4 animate-float">{agentAvatar}</div>
                <h3 className="font-bold text-zinc-200 text-base mb-2">Say hello to {agent.name}</h3>
                <p className="text-zinc-600 text-sm max-w-xs">{agent.description.slice(0, 100)}...</p>
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} userAvatar={userAvatar} agentAvatar={agentAvatar} />
              ))
            )}
            {sending && <TypingIndicator agentAvatar={agentAvatar} />}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="flex gap-2 items-end">
              <Textarea ref={inputRef} className="flex-1 resize-none min-h-[44px] max-h-32 py-2.5"
                placeholder={`Message ${agent.name}...`} rows={1} value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={sending} />
              <Button onClick={handleSend} disabled={!input.trim() || sending}
                size="icon" className="h-11 w-11 flex-shrink-0 rounded-xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </Button>
            </div>
            <p className="text-[10px] text-zinc-700 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  )
}
