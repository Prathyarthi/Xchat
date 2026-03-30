export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

export function getMonthDate(monthKey: string): Date {
  return new Date(`${monthKey}-01T00:00:00.000Z`)
}

export function shiftMonth(monthKey: string, delta: number): string {
  const date = getMonthDate(monthKey)
  date.setUTCMonth(date.getUTCMonth() + delta)
  return getMonthKey(date)
}

export function getMonthLabel(monthKey: string): string {
  const date = getMonthDate(monthKey)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function getDateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function buildCalendarDays(monthKey: string): string[] {
  const firstDay = getMonthDate(monthKey)
  const firstWeekday = firstDay.getUTCDay()
  const nextMonth = new Date(firstDay)
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
  const daysInMonth = Math.round((nextMonth.getTime() - firstDay.getTime()) / 86_400_000)

  const cells: string[] = []
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push('')
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${monthKey}-${String(day).padStart(2, '0')}`)
  }

  while (cells.length % 7 !== 0) {
    cells.push('')
  }

  return cells
}
