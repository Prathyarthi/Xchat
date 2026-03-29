'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/components/auth-provider'
import { emotionConfig } from '@/lib/emotion'
import { buildCalendarDays, getMonthLabel, getTodayKey, shiftMonth } from '@/features/journal/lib/date'

interface JournalMonthDay {
  id: string
  date: string
  mood: string | null
  summary: string | null
  entryCount: number
  updatedAt: string
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function JournalCalendarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [monthKey, setMonthKey] = useState(() => getTodayKey().slice(0, 7))
  const [days, setDays] = useState<JournalMonthDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/sign-in')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return

    setLoading(true)
    fetch(`/api/journal/month?month=${monthKey}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setDays(data.days || []))
      .finally(() => setLoading(false))
  }, [monthKey, user])

  const dayMap = useMemo(() => new Map(days.map(day => [day.date, day])), [days])
  const calendarDays = useMemo(() => buildCalendarDays(monthKey), [monthKey])
  const todayKey = getTodayKey()

  if (authLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-4xl animate-float">🗓️</div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] pb-16 px-4 pt-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Journal <span className="gradient-text">Calendar</span>
            </h1>
            <p className="text-zinc-600 text-sm mt-1">
              Open any day to reflect with AI using only that day&apos;s context.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full border-white/[0.08] text-zinc-400 hover:bg-white/[0.05]"
              onClick={() => setMonthKey(current => shiftMonth(current, -1))}
            >
              ← Previous
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-white/[0.08] text-zinc-400 hover:bg-white/[0.05]"
              onClick={() => setMonthKey(getTodayKey().slice(0, 7))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-white/[0.08] text-zinc-400 hover:bg-white/[0.05]"
              onClick={() => setMonthKey(current => shiftMonth(current, 1))}
            >
              Next →
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
          <Card className="rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">{getMonthLabel(monthKey)}</h2>
                  <p className="text-xs text-zinc-600 mt-1">{days.length} active journal day{days.length === 1 ? '' : 's'} this month</p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEKDAY_LABELS.map(label => (
                  <div key={label} className="px-2 py-1 text-xs text-zinc-600 text-center">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((dateKey, index) => {
                  if (!dateKey) {
                    return <div key={`blank-${index}`} className="aspect-square rounded-2xl border border-transparent" />
                  }

                  const day = dayMap.get(dateKey)
                  const moodMeta = day?.mood ? emotionConfig[day.mood as keyof typeof emotionConfig] : null
                  const isToday = dateKey === todayKey

                  return (
                    <Link
                      key={dateKey}
                      href={`/journal/${dateKey}`}
                      className={`aspect-square rounded-2xl border p-2 flex flex-col justify-between transition ${
                        day
                          ? 'glass-card border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.06]'
                          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]'
                      } ${isToday ? 'ring-1 ring-white/25' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-100">
                          {dateKey.slice(-2)}
                        </span>
                        {moodMeta && <span className="text-sm">{moodMeta.emoji}</span>}
                      </div>

                      <div className="min-h-0">
                        {day ? (
                          <>
                            <p className="text-[10px] text-zinc-400">{day.entryCount} entr{day.entryCount === 1 ? 'y' : 'ies'}</p>
                            {day.summary && (
                              <p className="text-[10px] text-zinc-600 mt-1 line-clamp-3">
                                {day.summary}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[10px] text-zinc-700">No entry yet</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardContent className="p-6 flex flex-col gap-5">
              <div>
                <h3 className="font-bold text-zinc-100">How it works</h3>
                <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                  Each date keeps its own journal context, so your AI reflection stays focused on that specific day instead of loading your whole history.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-700">Today</p>
                  <p className="text-sm text-zinc-400 mt-2">Capture what happened, how you felt, and what you need right now.</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-700">Daily context</p>
                  <p className="text-sm text-zinc-400 mt-2">AI sees only the entries saved for the day you open.</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-700">Habit loop</p>
                  <p className="text-sm text-zinc-400 mt-2">The calendar gives users a reason to return every day and keep their streak alive.</p>
                </div>
              </div>

              <Button asChild className="rounded-full">
                <Link href={`/journal/${todayKey}`}>Open today&apos;s journal</Link>
              </Button>

              {loading && <p className="text-xs text-zinc-700 text-center">Loading your month...</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
