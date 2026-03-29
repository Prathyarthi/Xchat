'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/components/auth-provider'
import { emotionConfig } from '@/lib/emotion'
import { getDateLabel } from '@/features/journal/lib/date'

interface JournalEntry {
  id: string
  content: string
  mood: string | null
  aiReflection: string | null
  createdAt: string
}

interface JournalDay {
  id: string | null
  date: string
  mood: string | null
  summary: string | null
  entries: JournalEntry[]
  updatedAt: string | null
}

const MOOD_OPTIONS = [
  { value: '', label: 'Auto detect from entry' },
  { value: 'happy', label: 'Happy' },
  { value: 'sad', label: 'Sad' },
  { value: 'angry', label: 'Angry' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'excited', label: 'Excited' },
  { value: 'lonely', label: 'Lonely' },
  { value: 'neutral', label: 'Neutral' },
]

export default function JournalDayPage() {
  const { date } = useParams() as { date: string }
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [day, setDay] = useState<JournalDay | null>(null)
  const [entry, setEntry] = useState('')
  const [mood, setMood] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/sign-in')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return

    setLoading(true)
    fetch(`/api/journal/${date}`, { credentials: 'include' })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load journal day.')
        }
        setDay(data.day)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load journal day.'))
      .finally(() => setLoading(false))
  }, [date, user])

  const latestReflection = useMemo(() => {
    return [...(day?.entries ?? [])].reverse().find(item => item.aiReflection)?.aiReflection ?? null
  }, [day])

  const handleSave = async () => {
    const content = entry.trim()
    if (!content) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date,
          content,
          ...(mood ? { mood } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save journal entry.')
      }

      setDay(data.day)
      setEntry('')
      setMood('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save journal entry.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-4xl animate-float">📝</div>
      </div>
    )
  }

  const dayMood = day?.mood ? emotionConfig[day.mood as keyof typeof emotionConfig] : null

  return (
    <div className="min-h-[calc(100vh-64px)] pb-16 px-4 pt-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/journal" className="text-xs text-zinc-500 hover:text-zinc-300">
              ← Back to journal calendar
            </Link>
            <h1 className="text-3xl font-bold mt-2">
              {getDateLabel(date)}
            </h1>
            <p className="text-zinc-600 text-sm mt-1">
              Write about this day. AI reflections stay scoped to this date.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full border-white/[0.08] text-zinc-400 hover:bg-white/[0.05]">
            <Link href={`/journal/${new Date().toISOString().slice(0, 10)}`}>Open today</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="flex flex-col gap-5">
            <Card className="rounded-3xl">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-bold text-zinc-100">Add an entry</h2>
                    <p className="text-sm text-zinc-600 mt-1">Capture what happened, what you felt, and what you need.</p>
                  </div>
                  {dayMood && (
                    <div className="text-sm text-zinc-300 flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-1.5">
                      <span>{dayMood.emoji}</span>
                      <span>{dayMood.label}</span>
                    </div>
                  )}
                </div>

                <Textarea
                  value={entry}
                  onChange={e => setEntry(e.target.value)}
                  placeholder="What was this day like for you?"
                  className="min-h-[180px] resize-none"
                  disabled={saving}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <select
                    value={mood}
                    onChange={e => setMood(e.target.value)}
                    disabled={saving}
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm text-zinc-300 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    {MOOD_OPTIONS.map(option => (
                      <option key={option.value || 'auto'} value={option.value} className="bg-[#0b1020]">
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <Button onClick={handleSave} disabled={saving || !entry.trim()} className="rounded-full">
                    {saving ? 'Saving...' : 'Save entry'}
                  </Button>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardContent className="p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-zinc-100">Entries</h2>
                  <p className="text-xs text-zinc-600">{day?.entries.length ?? 0} saved</p>
                </div>

                {loading ? (
                  <div className="text-sm text-zinc-600">Loading this day...</div>
                ) : day && day.entries.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {day.entries.map(item => {
                      const moodMeta = item.mood ? emotionConfig[item.mood as keyof typeof emotionConfig] : null
                      return (
                        <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-xs text-zinc-600">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {moodMeta && (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <span>{moodMeta.emoji}</span>
                                <span>{moodMeta.label}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                          {item.aiReflection && (
                            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-wider text-teal-300/80 mb-2">AI reflection</p>
                              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.aiReflection}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
                    <div className="text-4xl mb-3">🌙</div>
                    <p className="text-sm text-zinc-500">No entries for this day yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-5">
            <Card className="rounded-3xl">
              <CardContent className="p-6 flex flex-col gap-3">
                <h3 className="font-bold text-zinc-100">Day snapshot</h3>
                <p className="text-sm text-zinc-600">
                  This page uses only one day&apos;s journal history, which keeps reflections focused and token usage low.
                </p>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xl font-bold gradient-text">{day?.entries.length ?? 0}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">entries</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xl font-bold gradient-text">{dayMood?.emoji ?? '🫶'}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{dayMood?.label ?? 'No mood yet'}</p>
                  </div>
                </div>

                {day?.summary && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-700 mb-2">Summary</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">{day.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardContent className="p-6 flex flex-col gap-3">
                <h3 className="font-bold text-zinc-100">Latest reflection</h3>
                {latestReflection ? (
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{latestReflection}</p>
                ) : (
                  <p className="text-sm text-zinc-600">Save an entry to get a reflection for this day.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
