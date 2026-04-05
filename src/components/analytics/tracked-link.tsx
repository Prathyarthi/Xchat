'use client'

import Link, { type LinkProps } from 'next/link'
import type { ReactNode } from 'react'
import { trackClientEvent } from '@/features/analytics/lib/client'
import { cn } from '@/lib/utils'

interface TrackedLinkProps extends LinkProps {
  children: ReactNode
  className?: string
  eventName?: string
  eventProperties?: Record<string, unknown>
}

export function TrackedLink({
  children,
  className,
  eventName,
  eventProperties,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      className={cn('cursor-pointer', className)}
      onClick={() => {
        if (!eventName) return
        trackClientEvent({
          name: eventName,
          properties: eventProperties,
          path: typeof props.href === 'string' ? props.href : undefined,
        })
      }}
    >
      {children}
    </Link>
  )
}
