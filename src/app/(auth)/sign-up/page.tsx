'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const AVATARS = ['🌸', '🌊', '🌙', '⚡', '🦋', '🌿', '🔥', '🌟', '🎭', '🦁', '🐺', '🦊']

export default function SignUpPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', avatar: '🌸' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); setLoading(false); return }
      await signIn('credentials', { email: form.email, password: form.password, callbackUrl: '/explore' })
    } catch {
      setError('Failed to connect. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-up">
        <Card className="rounded-2xl px-2">
          <CardHeader className="text-center pb-0">
            <Link href="/" className="gradient-text font-bold text-2xl tracking-wider">Closr</Link>
            <h1 className="text-xl font-bold text-zinc-100 mt-3 mb-1">Join Closr</h1>
            <p className="text-zinc-600 text-sm">Create your account and find your companion</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Choose your avatar</Label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, avatar: emoji }))}
                      className={`h-10 rounded-xl text-xl ${
                        form.avatar === emoji
                          ? 'bg-white/[0.1] border border-white/25'
                          : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" type="text" placeholder="What should companions call you?"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required minLength={2} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="At least 8 characters"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required minLength={8} />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-sm text-zinc-600 mt-6">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-zinc-300 hover:text-zinc-100">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
