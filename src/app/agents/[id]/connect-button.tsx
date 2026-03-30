'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/components/auth-provider'
import { Button } from '@/components/ui/button'

export default function ConnectButton({ agentId, agentName }: { agentId: string; agentName: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!user) { router.push('/sign-in'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/conversations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agentId }),
      })
      const data = await res.json()
      if (res.ok) router.push(`/chat/${data.conversation.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      className="w-full rounded-2xl py-6 text-base font-semibold"
    >
      {loading ? 'Connecting...' : `Connect with ${agentName} →`}
    </Button>
  )
}
