const MS_PER_DAY = 86_400_000

const absoluteFormat = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const clockFormat = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
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

/**
 * Forma 14:32, ore a due cifre. L'indicatore di salvataggio è l'unica cosa dell'interfaccia
 * che sta sempre in vista, e a due cifre l'ora non cambia larghezza da un minuto all'altro
 * (design-system.md §5).
 *
 * Prende una Date e non una stringa di proposito: l'ora nasce nel browser al momento del
 * salvataggio riuscito. Calcolarla durante la resa sul server farebbe rendere due orari
 * diversi a server e client, e l'idratazione se ne lamenterebbe.
 */
export function formatClockTime(date: Date): string {
  return clockFormat.format(date)
}
