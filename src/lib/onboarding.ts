export interface ActivationStats {
  companionCount: number
  conversationCount: number
  journalDayCount: number
  reflectionCount: number
  lastConversationAt?: Date | null
  lastJournalAt?: Date | null
}

export interface ActivationStep {
  title: string
  description: string
  href: string
  completed: boolean
}

export function buildActivationSteps(stats: ActivationStats): ActivationStep[] {
  return [
    {
      title: 'Create or pick a companion',
      description: 'Shape a companion you want to keep talking to.',
      href: stats.companionCount > 0 ? '/explore' : '/agents/create',
      completed: stats.companionCount > 0,
    },
    {
      title: 'Send your first message',
      description: 'Kick off the memory loop with one real conversation.',
      href: stats.conversationCount > 0 ? '/dashboard' : '/explore',
      completed: stats.conversationCount > 0,
    },
    {
      title: 'Write a journal entry',
      description: 'Give Closr one day of context to reflect on.',
      href: '/journal',
      completed: stats.journalDayCount > 0,
    },
    {
      title: 'Unlock an AI reflection',
      description: 'See the product turn a day into something useful.',
      href: '/journal',
      completed: stats.reflectionCount > 0,
    },
  ]
}

export function getLifecycleNudge(stats: ActivationStats) {
  if (stats.conversationCount === 0) {
    return {
      title: 'Start the relationship loop',
      body: 'Users who send a first message early are much more likely to feel the memory and follow-up magic later.',
      href: stats.companionCount > 0 ? '/explore' : '/agents/create',
      cta: stats.companionCount > 0 ? 'Start chatting' : 'Create a companion',
    }
  }

  if (stats.journalDayCount === 0) {
    return {
      title: 'Add your first day of context',
      body: 'The journal is where Closr becomes more than chat and starts helping you process real life.',
      href: '/journal',
      cta: 'Open journal',
    }
  }

  if (stats.reflectionCount === 0) {
    return {
      title: 'Turn your journal into value',
      body: 'Run one reflection to experience the upgrade from storing thoughts to actually processing them.',
      href: '/journal',
      cta: 'Reflect on today',
    }
  }

  const lastTouch = [stats.lastConversationAt, stats.lastJournalAt]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0]

  if (!lastTouch) return null

  const daysSinceLastTouch = Math.floor((Date.now() - lastTouch.getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceLastTouch < 3) return null

  return {
    title: 'Keep the habit warm',
    body: 'A quick check-in or one short journal entry is enough to keep the emotional continuity alive.',
    href: '/journal',
    cta: 'Check back in',
  }
}
