'use client'

import { useQuery } from '@tanstack/react-query'

export interface SubscriptionMeRow {
  id: string
  userId: string
  planSlug: string
  status: string
  razorpaySubscriptionId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
}

export interface SubscriptionMeData {
  subscription: SubscriptionMeRow | null
  razorpayReady: boolean
}

async function fetchSubscriptionMe(): Promise<SubscriptionMeData> {
  const res = await fetch('/api/subscriptions/me', { credentials: 'include' })
  if (!res.ok) {
    throw new Error('Failed to load subscription')
  }
  const json = (await res.json()) as { data?: SubscriptionMeData }
  return json.data ?? { subscription: null, razorpayReady: false }
}

export function useSubscriptionMe(enabled = true) {
  return useQuery({
    queryKey: ['subscription', 'me'],
    enabled,
    queryFn: fetchSubscriptionMe,
  })
}
