'use client'

import Link from 'next/link'
import { useAuth } from '@/features/auth/components/auth-provider'
import { useSubscriptionMe } from '@/features/subscriptions/api/use-subscription-me'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavbarSubscribeVariant = 'desktop' | 'menu'

export function NavbarSubscribe({ variant = 'desktop' }: { variant?: NavbarSubscribeVariant }) {
  const { user, loading } = useAuth()
  const { data, isLoading } = useSubscriptionMe(!loading && Boolean(user))

  if (!user || loading || isLoading) return null

  const plusActive =
    data?.subscription?.status === 'ACTIVE' && data.subscription.planSlug === 'plus'
  if (plusActive) return null

  return (
    <Button
      size="sm"
      asChild
      className={cn(
        'rounded-full bg-teal-600 hover:bg-teal-500 text-white border-0',
        variant === 'desktop' && 'hidden sm:inline-flex',
        variant === 'menu' && 'w-full justify-center sm:hidden'
      )}
    >
      <Link href="/pricing">Subscribe</Link>
    </Button>
  )
}
