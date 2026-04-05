import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function formatDate(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/sign-in')

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  })

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50">Billing</h1>
          <p className="text-sm text-zinc-500 mt-1">Closer Plus is billed through Razorpay.</p>
        </div>

        <Card className="rounded-3xl border-white/[0.08]">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm font-medium text-zinc-200">Subscription</span>
              {subscription ? (
                <Badge variant="outline" className="rounded-full border-white/10 text-zinc-400">
                  {subscription.status}
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full border-white/10 text-zinc-500">
                  None
                </Badge>
              )}
            </div>

            {subscription ? (
              <dl className="text-sm space-y-2 text-zinc-500">
                <div className="flex justify-between gap-4">
                  <dt>Plan</dt>
                  <dd className="text-zinc-300">{subscription.planSlug === 'plus' ? 'Closer Plus' : subscription.planSlug}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Current period</dt>
                  <dd className="text-zinc-300 text-right">
                    {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}
                  </dd>
                </div>
                {subscription.razorpaySubscriptionId && (
                  <div className="flex justify-between gap-4">
                    <dt>Razorpay sub</dt>
                    <dd className="text-zinc-400 font-mono text-xs truncate max-w-[200px]">
                      {subscription.razorpaySubscriptionId}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-zinc-500">You do not have a subscription yet.</p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button asChild className="rounded-full">
                <Link href="/pricing">View plans</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/10 text-zinc-300">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
