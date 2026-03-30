'use client'

export interface ClientEventPayload {
  name: string
  path?: string
  properties?: Record<string, unknown>
}

export async function trackClientEvent(payload: ClientEventPayload) {
  if (typeof window === 'undefined') return

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        ...payload,
        path: payload.path ?? window.location.pathname,
      }),
    })
  } catch {
    // Analytics should never block product flows.
  }
}
