'use client'

import { Button } from '@/components/ui/button'
import { useSubscribePlus } from '../hooks/use-subscribe-plus'
import { cn } from '@/lib/utils'

interface SubscribePlusButtonProps {
  razorpayReady: boolean
  /** When payment is already pending, encourage completing checkout */
  pending?: boolean
  className?: string
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  fullWidth?: boolean
}

export function SubscribePlusButton({
  razorpayReady,
  pending = false,
  className,
  variant = 'default',
  size = 'default',
  fullWidth,
}: SubscribePlusButtonProps) {
  const { subscribeToPlus, subscribing, banner, clearBanner } = useSubscribePlus()

  const label = pending
    ? subscribing
      ? 'Opening checkout…'
      : 'Complete subscription'
    : subscribing
      ? 'Opening checkout…'
      : 'Subscribe to Closer Plus'

  return (
    <div className={cn(fullWidth && 'w-full', 'flex flex-col gap-2')}>
      {banner && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <span>{banner}</span>{' '}
          <button type="button" onClick={clearBanner} className="underline text-zinc-400 hover:text-zinc-200">
            Dismiss
          </button>
        </p>
      )}
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={!razorpayReady || subscribing}
        className={cn('rounded-full', fullWidth && 'w-full', className)}
        onClick={subscribeToPlus}
      >
        {label}
      </Button>
    </div>
  )
}
