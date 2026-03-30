'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const AVATARS = ['✨', '🌸', '🌊', '🌙', '🦋', '🌿', '🔥', '🌟', '🎭', '🦁', '🐺', '🦊', '🌺', '⚡', '🎪', '🌈']
const PRESET_TRAITS = ['Empathetic', 'Witty', 'Adventurous', 'Intellectual', 'Romantic', 'Playful', 'Wise', 'Creative', 'Mysterious', 'Nurturing', 'Bold', 'Gentle']
const PRESET_INTERESTS = ['Art', 'Music', 'Philosophy', 'Science', 'Travel', 'Books', 'Cooking', 'Nature', 'Technology', 'Fitness', 'Movies', 'Gaming', 'Poetry', 'History', 'Psychology', 'Astronomy']
const TONES = ['Romantic', 'Friendly', 'Intellectual', 'Mysterious', 'Playful', 'Calm']

const RELATIONSHIP_TYPES = [
  {
    value: 'ROMANTIC',
    emoji: '💕',
    label: 'Romantic',
    description: 'A loving partner who\'s intimate, caring, and expressive',
    color: 'border-pink-500/40 bg-pink-500/10 hover:border-pink-400/60',
    activeColor: 'border-pink-400 bg-pink-500/20',
  },
  {
    value: 'BESTIE',
    emoji: '🤝',
    label: 'Bestie',
    description: 'A best friend who\'s fun, real, and always in your corner',
    color: 'border-blue-500/40 bg-blue-500/10 hover:border-blue-400/60',
    activeColor: 'border-blue-400 bg-blue-500/20',
  },
  {
    value: 'MENTOR',
    emoji: '🧠',
    label: 'Mentor',
    description: 'A wise guide who challenges and helps you grow',
    color: 'border-amber-500/40 bg-amber-500/10 hover:border-amber-400/60',
    activeColor: 'border-amber-400 bg-amber-500/20',
  },
  {
    value: 'SUPPORT',
    emoji: '🫂',
    label: 'Support',
    description: 'A calm presence who listens and never judges',
    color: 'border-teal-500/40 bg-teal-500/10 hover:border-teal-400/60',
    activeColor: 'border-teal-400 bg-teal-500/20',
  },
]

export default function CreateAgentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    relationshipType: 'BESTIE',
    name: '', description: '', avatar: '✨',
    traits: [] as string[], communicationStyle: '', tone: 'Friendly', backstory: '', interests: [] as string[],
  })

  const toggleTrait = (t: string) =>
    setForm(f => ({ ...f, traits: f.traits.includes(t) ? f.traits.filter(x => x !== t) : [...f.traits.slice(0, 4), t] }))

  const toggleInterest = (i: string) =>
    setForm(f => ({ ...f, interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests.slice(0, 7), i] }))

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name, description: form.description, avatar: form.avatar,
          interests: form.interests, relationshipType: form.relationshipType,
          personality: { traits: form.traits, communicationStyle: form.communicationStyle, tone: form.tone, backstory: form.backstory },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create agent'); return }
      router.push('/explore')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedBtn = 'bg-white/[0.1] border border-white/25 text-zinc-200'
  const defaultBtn = 'bg-white/[0.03] border border-white/[0.08] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-300'

  return (
    <div className="min-h-[calc(100vh-64px)] pb-16 px-4 pt-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Create a <span className="gradient-text">Companion</span>
          </h1>
          <p className="text-zinc-600 text-sm">Shape a companion people can return to for memory, reflection, and a distinct relationship vibe.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-zinc-200 text-zinc-900'
                : step > s ? 'bg-white/8 text-zinc-400'
                : 'bg-white/3 border border-white/8 text-zinc-600'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 4 && <div className={`w-12 h-px ${step > s ? 'bg-white/20' : 'bg-white/6'}`} />}
            </div>
          ))}
        </div>

        <Card className="rounded-3xl">
          <CardContent className="p-6 md:p-8">
            {/* Step 1 — Relationship Type */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-bold text-zinc-100 text-lg">What kind of companion is this?</h2>
                  <p className="text-zinc-600 text-sm mt-1">This shapes how they talk and connect with people.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {RELATIONSHIP_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, relationshipType: rt.value }))}
                      className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                        form.relationshipType === rt.value ? rt.activeColor : rt.color
                      }`}
                    >
                      <span className="text-3xl">{rt.emoji}</span>
                      <div>
                        <p className="font-bold text-zinc-100 text-sm">{rt.label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{rt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <Button onClick={() => setStep(2)} className="w-full rounded-xl">
                  Next: Identity →
                </Button>
              </div>
            )}

            {/* Step 2 — Identity */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <h2 className="font-bold text-zinc-100 text-lg">Identity</h2>
                <div className="flex flex-col gap-2">
                  <Label>Choose an avatar</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {AVATARS.map(emoji => (
                      <button key={emoji} type="button" onClick={() => setForm(f => ({ ...f, avatar: emoji }))}
                        className={`h-10 rounded-xl text-xl ${form.avatar === emoji ? 'bg-white/10 border border-white/25' : 'bg-white/3 border border-white/6 hover:bg-white/[0.07]'}`}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" placeholder="e.g. Aurora, Kai, Luna..." value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Who are they? *</Label>
                  <Textarea id="description" placeholder="Describe this companion's essence..." value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[100px] resize-none" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-white/8 text-zinc-400 hover:bg-white/5 rounded-xl">← Back</Button>
                  <Button onClick={() => {
                    if (!form.name.trim() || form.name.length < 2) { setError('Name must be at least 2 characters'); return }
                    if (!form.description.trim() || form.description.length < 10) { setError('Description must be at least 10 characters'); return }
                    setError(''); setStep(3)
                  }} className="flex-1 rounded-xl">
                    Next: Personality →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 — Personality */}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <h2 className="font-bold text-zinc-100 text-lg">Personality</h2>
                <div className="flex flex-col gap-2">
                  <Label>Core traits <span className="text-zinc-700">(up to 5)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_TRAITS.map(trait => (
                      <button key={trait} type="button" onClick={() => toggleTrait(trait)}
                        className={`text-xs px-3 py-1.5 rounded-full border ${form.traits.includes(trait) ? selectedBtn : defaultBtn}`}>
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Tone</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONES.map(tone => (
                      <button key={tone} type="button" onClick={() => setForm(f => ({ ...f, tone }))}
                        className={`text-sm py-2.5 rounded-xl border ${form.tone === tone ? selectedBtn : defaultBtn}`}>
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="style">Communication style</Label>
                  <Input id="style" placeholder="e.g. warm and poetic, witty and sharp..." value={form.communicationStyle}
                    onChange={e => setForm(f => ({ ...f, communicationStyle: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="backstory">Backstory <span className="text-zinc-700">(optional)</span></Label>
                  <Textarea id="backstory" placeholder="Where did they come from? What shaped them?" value={form.backstory}
                    onChange={e => setForm(f => ({ ...f, backstory: e.target.value }))} className="min-h-[80px] resize-none" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-white/8 text-zinc-400 hover:bg-white/5 rounded-xl">← Back</Button>
                  <Button onClick={() => setStep(4)} className="flex-1 rounded-xl">Next: Interests →</Button>
                </div>
              </div>
            )}

            {/* Step 4 — Interests */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-bold text-zinc-100 text-lg">Interests & Passions</h2>
                  <p className="text-sm text-zinc-600 mt-1">What does {form.name || 'this companion'} care about? Pick up to 8.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_INTERESTS.map(interest => (
                    <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                      className={`text-sm px-4 py-2 rounded-full border ${form.interests.includes(interest) ? selectedBtn : defaultBtn}`}>
                      {interest}
                    </button>
                  ))}
                </div>

                <div className="glass rounded-2xl p-4">
                  <p className="text-[10px] text-zinc-700 uppercase tracking-wider mb-3">Preview</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl bg-zinc-800/60 border border-white/8">
                      {form.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100 text-sm">{form.name || 'Unnamed'}</p>
                      <p className="text-xs text-zinc-500">{form.tone}</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {form.description.slice(0, 80)}{form.description.length > 80 ? '...' : ''}
                  </p>
                  {form.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {form.interests.map(i => (
                        <Badge key={i} variant="outline" className="border-white/10 text-zinc-400 bg-white/4 text-xs rounded-full">{i}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1 border-white/8 text-zinc-400 hover:bg-white/5 rounded-xl">← Back</Button>
                  <Button onClick={handleSubmit} disabled={loading} className="flex-1 rounded-xl">
                    {loading ? 'Creating...' : '✨ Bring to Life'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
