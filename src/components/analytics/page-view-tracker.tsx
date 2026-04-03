'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackClientEvent } from '@/features/analytics/lib/client'

export function PageViewTracker() {
  const pathname = usePathname()
  const previousPath = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || previousPath.current === pathname) return
    previousPath.current = pathname
    trackClientEvent({ name: 'page_view', path: pathname })
  }, [pathname])

  return null
}
