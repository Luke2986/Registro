const MS_PER_DAY = 86_400_000

const absoluteFormat = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * Forma relativa entro la settimana ("3 giorni fa"), poi assoluta (design-system.md §5).
 */
export function formatLastActivity(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const days = Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY)

  if (days <= 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 7) return `${days} giorni fa`

  return absoluteFormat.format(date)
}
