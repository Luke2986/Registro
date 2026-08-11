#!/usr/bin/env bash
#
# Copia di sicurezza del database, da eseguire con `npm run backup`.
#
# Esiste perché il progetto sta sul piano free di Supabase, dove non c'è nessun backup
# automatico e nessuno scaricabile: è la stessa cosa che Supabase raccomanda di fare al piano
# free. Se un giorno il progetto passa a Pro, i backup giornalieri arrivano da soli e questo
# script diventa la copia in più, non l'unica.
#
# Cosa salva: lo schema `public` per intero — tabelle, dati, funzioni, policy e permessi.
# Cosa NON salva: `auth.users`, cioè il tuo accesso. Per un ripristino sullo *stesso* progetto
# non serve, perché l'utente è ancora lì. Per ripristinare su un progetto *nuovo* va creato
# prima l'utente con lo stesso id, altrimenti i vincoli `owner_id -> auth.users(id)` rifiutano
# le righe. Nemmeno i file dello Storage: oggi il software non ne carica (D12 è di là da venire).

set -euo pipefail

# La stringa di connessione non si stampa mai: contiene la password del database. Nessun `set -x`
# in questo file per la stessa ragione.
ENV_FILE=".env.backup.local"

if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  cat >&2 <<'FINE'
Manca DATABASE_URL.

Prendila dalla dashboard Supabase, in alto il pulsante Connect. Va bene la voce
"Session pooler", porta 5432. NON il "Transaction pooler" sulla porta 6543:
pg_dump non ci lavora. La voce "Direct connection" funziona solo se la tua linea
di casa ha IPv6, e il session pooler evita la questione.

Poi scrivila in .env.backup.local alla radice del repository:

  DATABASE_URL=postgresql://postgres.izkycpwxuedpkzgpvcxc:LA_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres

Quel file è già ignorato da git dalla regola .env*.local, e ci deve restare: contiene
la password del database.
FINE
  exit 1
fi

# pg_dump non è nel PATH quasi mai su macOS: il pacchetto libpq di Homebrew è keg-only e
# Postgres.app tiene i binari dentro il bundle. Si cerca invece di pretendere che ci sia.
PG_DUMP="${PG_DUMP:-}"

if [[ -z "$PG_DUMP" ]]; then
  for candidate in \
    pg_dump \
    /Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump \
    /opt/homebrew/opt/libpq/bin/pg_dump \
    /usr/local/opt/libpq/bin/pg_dump \
    /Library/PostgreSQL/*/bin/pg_dump
  do
    if command -v "$candidate" >/dev/null 2>&1; then
      PG_DUMP="$candidate"
      break
    fi
  done
fi

if [[ -z "$PG_DUMP" ]]; then
  cat >&2 <<'FINE'
Manca pg_dump, e su questo Mac non c'è Homebrew per installarlo in un comando.

La strada più corta è Postgres.app: si scarica da https://postgresapp.com, si trascina
in Applicazioni e basta — non serve avviarlo, servono solo i suoi programmi. Questo
script lo trova da sé, dentro il bundle.

Se un giorno installi Homebrew, l'alternativa è `brew install libpq`: anche lì il
programma resta fuori dal PATH, e questo script lo cerca comunque.

Serve una versione almeno pari a quella del server, che è Postgres 17: una più vecchia
rifiuta il dump invece di produrne uno incompleto, il che è il comportamento giusto.
FINE
  exit 1
fi

# Fuori dal repository di proposito: il dump contiene dati veri di clienti, e una cartella dentro
# il repo è a un `git add -f` di distanza dal finire su GitHub.
BACKUP_DIR="${BACKUP_DIR:-$HOME/Documents/Registro-backup}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y-%m-%d-%H%M)"
TARGET="$BACKUP_DIR/registro-$STAMP.sql"

echo "Copia in corso verso $TARGET"
echo "con $PG_DUMP"

# Su file temporaneo e poi rinominato: un dump interrotto a metà non deve prendere il nome di uno
# buono, o al momento del bisogno si ripristina un file troncato credendolo intero.
TMP="$TARGET.parziale"
trap 'rm -f "$TMP"' EXIT

"$PG_DUMP" "$DATABASE_URL" --schema=public --file="$TMP"

# Una soglia grossolana contro il dump vuoto: lo schema da solo supera abbondantemente questa
# dimensione, quindi sotto vuol dire che qualcosa è andato storto in silenzio. Il file mancante
# conta come dimensione zero e non come errore dello script: qui l'unica cosa da dire è che la
# copia non c'è.
SIZE="$( { wc -c < "$TMP" || echo 0; } 2>/dev/null | tr -d ' ')"

if [[ "$SIZE" -lt 4096 ]]; then
  echo "Il dump è di $SIZE byte: troppo poco per essere buono. Non lo tengo." >&2
  exit 1
fi

mv "$TMP" "$TARGET"
trap - EXIT

chmod 600 "$TARGET"

echo "Fatto: $TARGET ($SIZE byte)"
echo
echo "I file vecchi non si cancellano da soli: guarda ogni tanto $BACKUP_DIR."
echo "Una copia che sta sullo stesso disco del computer non è una copia: portane una fuori."
