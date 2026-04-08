'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

export function useSubscribePlus() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [subscribing, setSubscribing] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    const src = 'https://checkout.razorpay.com/v1/checkout.js'
    if (document.querySelector(`script[src="${src}"]`)) return
    const script = document.createElement('script')
    script.src = src
    script.async = true
    document.body.appendChild(script)
  }, [])

  const openCheckout = useCallback(
    async (razorpaySubscriptionId: string, razorpayKey: string) => {
      const options: Record<string, unknown> = {
        key: razorpayKey,
        subscription_id: razorpaySubscriptionId,
        name: 'Closer',
        description: 'Closer Plus — monthly',
        handler: async (response: RazorpayResponse) => {
          const verifyRes = await fetch('/api/subscriptions/verify', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySubscriptionId: response.razorpay_subscription_id,
              razorpaySignature: response.razorpay_signature,
            }),
          })
          const verifyJson = await verifyRes.json().catch(() => ({}))
          if (!verifyRes.ok) {
            setBanner(typeof verifyJson.error === 'string' ? verifyJson.error : 'Payment verification failed')
            return
          }
          await queryClient.invalidateQueries({ queryKey: ['subscription', 'me'] })
          setBanner(null)
          router.push('/billing')
        },
        theme: { color: '#2dd4bf' },
        modal: {
          ondismiss: () => setSubscribing(false),
        },
      }

      if (typeof window.Razorpay !== 'function') {
        setBanner('Checkout script is still loading. Try again in a moment.')
        setSubscribing(false)
        return
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    },
    [queryClient, router]
  )

  const subscribeToPlus = useCallback(async () => {
    setBanner(null)
    setSubscribing(true)
    try {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug: 'plus' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBanner(typeof json.error === 'string' ? json.error : 'Could not start checkout')
        setSubscribing(false)
        return
      }
      const payload = json.data as { razorpaySubscriptionId?: string; razorpayKey?: string }
      if (!payload?.razorpaySubscriptionId || !payload?.razorpayKey) {
        setBanner('Invalid response from server')
        setSubscribing(false)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['subscription', 'me'] })
      await openCheckout(payload.razorpaySubscriptionId, payload.razorpayKey)
    } catch {
      setBanner('Network error. Please try again.')
      setSubscribing(false)
    }
  }, [openCheckout, queryClient])

  return { subscribeToPlus, subscribing, banner, clearBanner: () => setBanner(null) }
}
