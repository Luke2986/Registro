const MS_PER_DAY = 86_400_000

/**
 * Il fuso si dichiara qui perché formatLastActivity gira sul server: su Vercel il fuso è UTC,
 * in casa è Roma, e una modifica delle 00:30 di Roma si renderebbe come il giorno prima. Una
 * costante e non una variabile d'ambiente: così sta nel codice, si legge, e vale identica nei
 * tre ambienti. È lo script `test` a eseguire con `TZ=UTC`, così il fuso della macchina non
 * coincide mai con quello dichiarato e un `timeZone` dimenticato fa fallire un test invece di
 * nascondersi fino al rilascio.
 */
const TIME_ZONE = 'Europe/Rome'

/**
 * Un formattatore solo per due usi: la forma assoluta lo chiama con `format`, il giorno civile
 * con `formatToParts`. Dichiararne due con le stesse opzioni darebbe due `resolvedOptions()`
 * identiche destinate a divergere alla prima modifica di una sola (`kb-0.md` §9).
 */
const absoluteFormat = new Intl.DateTimeFormat('it-IT', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const clockFormat = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Il giorno civile come numero: due istanti dello stesso giorno a Roma danno lo stesso numero,
 * e la differenza fra due numeri è la differenza in giorni. Si ricava dalle parti formattate nel
 * fuso dichiarato e non da getDate(), che risponde nel fuso della macchina.
 *
 * Il controllo sulle tre parti non è difensivo: `noUncheckedIndexedAccess` rende `find` un
 * `| undefined`, e la regola è gestirlo con un controllo e mai con un `as`. Su una data valida
 * le tre parti ci sono sempre, perché stanno nelle opzioni risolte.
 */
function civilDay(date: Date): number {
  const parts = absoluteFormat.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')
  const month = parts.find((part) => part.type === 'month')
  const day = parts.find((part) => part.type === 'day')

  if (!year || !month || !day) return Number.NaN

  return Date.UTC(Number(year.value), Number(month.value) - 1, Number(day.value)) / MS_PER_DAY
}

/**
 * Forma relativa entro la settimana ("3 giorni fa"), poi assoluta (design-system.md §5).
 *
 * La differenza è fra giorni civili e non fra periodi di ventiquattro ore: una modifica delle
 * 23:00 di ieri, guardata alle 08:00 di stamattina, deve leggersi `ieri`, che è quello che una
 * persona intende quando legge quella parola.
 *
 * Una stringa che non si legge rende una cella vuota e non un'eccezione: `Intl` lancia su una
 * data invalida, e qui siamo dentro un componente server, dove un'eccezione è la pagina intera
 * che non si rende. Un valore non rilevato si mostra vuoto, mai come zero e mai come un errore.
 */
export function formatLastActivity(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const days = civilDay(now) - civilDay(date)

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
 *
 * Per la stessa ragione clockFormat non dichiara TIME_ZONE, e non è una dimenticanza: questa
 * funzione gira solo nel browser, dove il fuso giusto è già quello della macchina. Imporgliene
 * uno fisso sarebbe la risposta a un problema che non ha.
 */
export function formatClockTime(date: Date): string {
  return clockFormat.format(date)
}
