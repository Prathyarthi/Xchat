import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { getGrowthSnapshot } from '@/features/analytics/lib/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Analytics — Closer',
  robots: { index: false, follow: false },
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/sign-in')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const snapshot = await getGrowthSnapshot()
  const rows = Object.entries(snapshot.counts).sort((a, b) => b[1] - a[1])
  const total = rows.reduce((sum, [, n]) => sum + n, 0)

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Internal</p>
            <h1 className="text-3xl font-bold text-zinc-50 mt-1">Analytics</h1>
            <p className="text-sm text-zinc-500 mt-2">
              Event counts from the last {snapshot.periodDays} days.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full border-white/10 text-zinc-300 shrink-0">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </header>

        <Card className="rounded-3xl border-white/[0.08] bg-white/[0.02]">
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="p-8 text-sm text-zinc-500 text-center">No events in this period yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-left text-zinc-500">
                      <th className="px-6 py-3 font-medium">Event</th>
                      <th className="px-6 py-3 font-medium text-right tabular-nums">Count</th>
                      <th className="px-6 py-3 font-medium text-right text-zinc-600 w-24">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([name, count]) => (
                      <tr key={name} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-6 py-3 text-zinc-200 font-mono text-xs">{name}</td>
                        <td className="px-6 py-3 text-right tabular-nums text-zinc-300">{count}</td>
                        <td className="px-6 py-3 text-right text-zinc-600 tabular-nums">
                          {total > 0 ? `${Math.round((count / total) * 100)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                      <td className="px-6 py-3 font-medium text-zinc-400">Total</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium text-zinc-200">{total}</td>
                      <td className="px-6 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
