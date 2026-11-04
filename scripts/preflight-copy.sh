#!/usr/bin/env bash
# READ-ONLY inspection of a COPY of the production database, before any migration is attempted on that copy.
# It never writes: the session is forced read-only, and only SELECT statements and `prisma migrate diff/status`
# (introspection) are used. It never prints the connection URL.
#
# Required environment:
#   COPY_DATABASE_URL           connection URL of the COPY (never the production URL)
#   CONFIRM_THIS_IS_A_COPY=yes  explicit acknowledgement by the operator
# Optional environment:
#   FORBIDDEN_HOST_PATTERN      extended regex; refuse if the URL matches (put your production host name here)
#   PRISMA                      prisma command (default "npx prisma", run from ./backend)
#
# Exit codes: 0 ready · 2 schema differs from the expected baseline · 3 unexpected state · 64 refused
set -euo pipefail

refuse() { echo "REFUSED: $*" >&2; exit 64; }

: "${COPY_DATABASE_URL:?COPY_DATABASE_URL is required}"
[ "${CONFIRM_THIS_IS_A_COPY:-}" = "yes" ] || refuse "set CONFIRM_THIS_IS_A_COPY=yes only after checking that the URL targets a copy, not production."
if [ -n "${FORBIDDEN_HOST_PATTERN:-}" ] && printf '%s' "$COPY_DATABASE_URL" | grep -Eq "$FORBIDDEN_HOST_PATTERN"; then
  refuse "the URL matches FORBIDDEN_HOST_PATTERN (looks like production)."
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRISMA="${PRISMA:-npx prisma}"
export PGOPTIONS="-c default_transaction_read_only=on"
q() { psql "$COPY_DATABASE_URL" -v ON_ERROR_STOP=1 -Atq -c "$1"; }

# Only the host and database name are shown, to let the operator double-check the target.
target="$(printf '%s' "$COPY_DATABASE_URL" | sed -E 's#^[a-z]+://[^@]*@##; s#\?.*$##')"
echo "target (host/database): $target"

[ "$(q 'show default_transaction_read_only')" = "on" ] || refuse "could not force a read-only session."
echo "server: $(q 'show server_version')"
has() { [ "$(q "select to_regclass('public.\"$1\"') is not null")" = "t" ]; }
tables="$(q "select count(*) from pg_tables where schemaname='public'")"
echo "tables in schema public: $tables"

cd "$ROOT/backend"
export DATABASE_URL="$COPY_DATABASE_URL"

if [ "$tables" = "0" ]; then
  echo "STATE: empty database -> a plain 'prisma migrate deploy' creates the schema."
  echo "VERDICT: READY"
  exit 0
fi

if has "_prisma_migrations"; then
  echo "STATE: migration history present"
  q 'select migration_name || case when finished_at is null then "  (NOT FINISHED)" else "" end from _prisma_migrations order by migration_name' | sed 's/^/  /'
  $PRISMA migrate status || { echo "VERDICT: ATTENTION (migrate status reports a problem)"; exit 3; }
  echo "VERDICT: READY (history managed by Prisma; run 'migrate deploy' on the copy)"
  exit 0
fi

has "User" || { echo "STATE: unknown tables, no User table"; echo "VERDICT: STOP"; exit 3; }
has "Plant" && { echo "STATE: Plant tables exist but there is no migration history (manual change?)"; echo "VERDICT: STOP"; exit 3; }

echo "STATE: legacy schema without migration history (the P3005 situation)"
echo "row counts:"
for t in User Strain GrowProject GrowLog Task NutrientPlan; do
  has "$t" && printf '  %-14s %s\n' "$t" "$(q "select count(*) from \"$t\"")" || printf '  %-14s (absent)\n' "$t"
done

echo "comparing with prisma/baseline.prisma (what migration 0_init assumes)..."
if $PRISMA migrate diff --from-url "$COPY_DATABASE_URL" --to-schema-datamodel prisma/baseline.prisma --exit-code; then
  echo "VERDICT: READY FOR BASELINE (then: migrate resolve --applied 0_init ; migrate deploy — on the copy only)"
  exit 0
fi
echo "VERDICT: SCHEMA DIFFERS from baseline.prisma. Do NOT run 'migrate resolve'. Send the diff above for analysis." >&2
exit 2
