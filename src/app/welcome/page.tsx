import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { prisma } from '@/lib/prisma'
import { buildActivationSteps } from '@/lib/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function WelcomePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id as string
  const [companionCount, conversationCount, journalDayCount, reflectionCount] = await Promise.all([
    prisma.agent.count({ where: { creatorId: userId } }),
    prisma.conversation.count({ where: { userId } }),
    prisma.journalDay.count({ where: { userId } }),
    prisma.journalDay.count({ where: { userId, summary: { not: null } } }),
  ])

  const steps = buildActivationSteps({
    companionCount,
    conversationCount,
    journalDayCount,
    reflectionCount,
  })

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Welcome to Closer</p>
          <h1 className="text-4xl md:text-5xl font-bold mt-3">
            Start with one real conversation, then let the habit grow
          </h1>
          <p className="text-zinc-600 text-sm md:text-base max-w-2xl mx-auto mt-4 leading-relaxed">
            Closer works best when you combine a companion, a journal day, and one AI reflection. That gives the product enough context to start feeling personal.
          </p>
        </div>

        <Card className="rounded-3xl">
          <CardContent className="p-6 md:p-8 flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-zinc-100">Your first-week checklist</h2>
                <p className="text-sm text-zinc-600 mt-1">These are the moments we want every new user to hit.</p>
              </div>
              <div className="rounded-full border border-white/8 px-3 py-1 text-xs text-zinc-400">
                {steps.filter(step => step.completed).length}/{steps.length} complete
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map(step => (
                <Link
                  key={step.title}
                  href={step.href}
                  className={`rounded-2xl border p-5 transition ${step.completed
                      ? 'border-teal-500/30 bg-teal-500/8'
                      : 'border-white/8 bg-white/3 hover:bg-white/5'
                    }`}
                >
                  <p className="text-xs uppercase tracking-wider text-zinc-700">{step.completed ? 'Completed' : 'Next step'}</p>
                  <h3 className="font-bold text-zinc-100 mt-2">{step.title}</h3>
                  <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{step.description}</p>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full">
                <Link href={steps.find(step => !step.completed)?.href ?? '/dashboard'}>
                  {steps.find(step => !step.completed)?.title ?? 'Go to dashboard'}
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/8 text-zinc-300 hover:bg-white/5">
                <Link href="/pricing">See premium benefits</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
