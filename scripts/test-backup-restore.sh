#!/usr/bin/env bash
# Proves, on THROWAWAY databases only, that a pg_dump backup of CanopyOS can be restored faithfully and that a
# failed upgrade can be rolled back by restoring the pre-upgrade backup into a fresh database.
#
# Required environment:
#   PG_ADMIN_URL   connection URL of a maintenance database (e.g. .../postgres) on a THROWAWAY server;
#                  the script creates and drops the databases br_source, br_restore, br_legacy, br_rollback.
#   CONFIRM_THROWAWAY_SERVER=yes   explicit acknowledgement that the server holds no real data.
# Optional: PRISMA (default "npx prisma", run from ./backend), WORK_DIR (default mktemp).
set -euo pipefail

: "${PG_ADMIN_URL:?PG_ADMIN_URL is required}"
if [ "${CONFIRM_THROWAWAY_SERVER:-}" != "yes" ]; then
  echo "Refusing to run: set CONFIRM_THROWAWAY_SERVER=yes (this script drops and creates databases)." >&2
  exit 64
fi
case "$PG_ADMIN_URL" in
  *localhost*|*127.0.0.1*|*@postgres:*|*@db:*) ;;
  *) echo "Refusing to run: PG_ADMIN_URL must point to localhost or a CI service container." >&2; exit 64 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRISMA="${PRISMA:-npx prisma}"
WORK_DIR="${WORK_DIR:-$(mktemp -d)}"
cd "$ROOT/backend"

db_url() { # replaces the database name of PG_ADMIN_URL
  echo "${PG_ADMIN_URL%/*}/$1"
}
admin() { psql "$PG_ADMIN_URL" -v ON_ERROR_STOP=1 -q "$@"; }
sql()   { psql "$(db_url "$1")" -v ON_ERROR_STOP=1 -q "${@:2}"; }
fresh_db() { admin -c "DROP DATABASE IF EXISTS $1 WITH (FORCE)" -c "CREATE DATABASE $1"; }
step() { printf '\n== %s\n' "$*"; }
fail() { echo "FAILED: $*" >&2; exit 1; }

# One md5 per table (rows rendered as text, sorted) + _prisma_migrations identity columns.
fingerprint() {
  local db="$1" t
  for t in $(sql "$db" -Atc "select tablename from pg_tables where schemaname='public' and tablename <> '_prisma_migrations' order by 1"); do
    printf '%s %s %s\n' "$t" "$(sql "$db" -Atc "select count(*) from \"$t\"")" \
      "$(sql "$db" -Atc "select coalesce(md5(string_agg(x::text, '|' order by x::text)),'-') from \"$t\" x")"
  done
  if [ "$(sql "$db" -Atc "select to_regclass('public._prisma_migrations') is not null")" = "t" ]; then
    printf '_prisma_migrations %s\n' "$(sql "$db" -Atc "select coalesce(string_agg(migration_name||':'||checksum, ',' order by migration_name),'-') from _prisma_migrations")"
  fi
}

step "Tool versions"
psql --version; pg_dump --version; pg_restore --version
echo "server: $(admin -Atc 'show server_version')"

# ------------------------------------------------------------------------------------------------ 1
step "1. Fresh database migrated to the current schema, filled with fictitious data"
fresh_db br_source
export DATABASE_URL; DATABASE_URL="$(db_url br_source)"
$PRISMA migrate deploy
sql br_source <<'SQL'
INSERT INTO "User"(id,email,password,name,"updatedAt") VALUES
  ('u1','backup-a@example.test','not-a-real-hash','Backup A',now()),
  ('u2','backup-b@example.test','not-a-real-hash','Backup B',now());
INSERT INTO "Strain"(id,name,genetics,"floweringWeeks","yieldEstimate",difficulty,"climateSuitability")
  VALUES ('s1','Fictional Strain','HYBRID',9,'medium','EASY','temperate');
INSERT INTO "GrowProject"(id,name,"growType","growMethod","startDate","userId","strainId","updatedAt")
  VALUES ('p1','Backup project','INDOOR','SOIL',now(),'u1','s1',now());
INSERT INTO "Plant"(id,name,"customStrain","growType","growMethod","userId","updatedAt")
  VALUES ('pl1','Backup plant','Fictional variety','INDOOR','COCO','u1',now()),
         ('pl2','Other plant','Fictional variety','OUTDOOR','SOIL','u2',now());
INSERT INTO "PlantLog"(id,"plantId",notes,ph,ec,temperature,humidity)
  VALUES ('pll1','pl1','entrée avec accents é à ü',6.1,1.4,23.5,55),('pll2','pl1',NULL,5.9,NULL,NULL,NULL);
INSERT INTO "PlantPhoto"(id,"plantId","fileName","mimeType")
  VALUES ('ph1','pl1','00000000-0000-4000-8000-000000000000.png','image/png');
SQL
fingerprint br_source > "$WORK_DIR/source.fp"
cat "$WORK_DIR/source.fp"
grep -q '^Plant 2 ' "$WORK_DIR/source.fp" || fail "unexpected source content"

# ------------------------------------------------------------------------------------------------ 2
step "2. pg_dump (custom format) and archive integrity"
pg_dump --format=custom --no-owner --no-acl --file="$WORK_DIR/source.dump" "$(db_url br_source)"
test -s "$WORK_DIR/source.dump" || fail "empty dump"
pg_restore --list "$WORK_DIR/source.dump" > "$WORK_DIR/source.list"
for table in User Strain GrowProject Plant PlantLog PlantPhoto _prisma_migrations; do
  grep -q "TABLE public \"\?$table\"\? " "$WORK_DIR/source.list" || fail "table $table missing from the archive"
done
echo "archive: $(wc -c < "$WORK_DIR/source.dump") bytes, $(grep -c ' TABLE DATA ' "$WORK_DIR/source.list") data sections"

# ------------------------------------------------------------------------------------------------ 3
step "3. pg_restore into a brand-new database: identical content"
fresh_db br_restore
pg_restore --no-owner --no-acl --exit-on-error --dbname="$(db_url br_restore)" "$WORK_DIR/source.dump"
fingerprint br_restore > "$WORK_DIR/restore.fp"
diff -u "$WORK_DIR/source.fp" "$WORK_DIR/restore.fp" || fail "restored database differs from the source"
echo "restored content is identical (row counts and per-table md5)"
DATABASE_URL="$(db_url br_restore)" $PRISMA migrate status
DATABASE_URL="$(db_url br_restore)" $PRISMA migrate diff --from-url "$(db_url br_restore)" --to-schema-datamodel prisma/schema.prisma --exit-code
echo "restored schema equals schema.prisma, no migration pending"
sql br_restore -c "INSERT INTO \"PlantLog\"(id,\"plantId\",notes) VALUES ('after-restore','pl1','write after restore')"
echo "restored database accepts writes"

# ------------------------------------------------------------------------------------------------ 4
step "4. Rollback of an upgrade: backup -> upgrade -> restore into a fresh database -> upgrade again"
fresh_db br_legacy
DATABASE_URL="$(db_url br_legacy)" $PRISMA db push --schema prisma/baseline.prisma --skip-generate
sql br_legacy <<'SQL'
INSERT INTO "User"(id,email,password,name,"updatedAt") VALUES ('u1','legacy-a@example.test','not-a-real-hash','Legacy A',now());
INSERT INTO "Strain"(id,name,genetics,"floweringWeeks","yieldEstimate",difficulty,"climateSuitability")
  VALUES ('s1','Fictional Strain','HYBRID',9,'medium','EASY','temperate');
INSERT INTO "GrowProject"(id,name,"growType","growMethod","startDate","userId","strainId","updatedAt")
  VALUES ('p1','Legacy project','INDOOR','SOIL',now(),'u1','s1',now());
INSERT INTO "GrowLog"(id,notes,ph,"growProjectId") VALUES ('l1','legacy note',6.1,'p1');
SQL
fingerprint br_legacy > "$WORK_DIR/legacy-before.fp"
pg_dump --format=custom --no-owner --no-acl --file="$WORK_DIR/legacy.dump" "$(db_url br_legacy)"
echo "pre-upgrade backup taken ($(wc -c < "$WORK_DIR/legacy.dump") bytes)"

DATABASE_URL="$(db_url br_legacy)" $PRISMA migrate diff --from-url "$(db_url br_legacy)" --to-schema-datamodel prisma/baseline.prisma --exit-code
DATABASE_URL="$(db_url br_legacy)" $PRISMA migrate resolve --applied 0_init
DATABASE_URL="$(db_url br_legacy)" $PRISMA migrate deploy
test "$(sql br_legacy -Atc "select to_regclass('public.\"Plant\"') is not null")" = "t" || fail "upgrade did not create Plant"
echo "upgrade applied on br_legacy"

# Rollback = a FRESH database + pg_restore of the backup taken before the upgrade.
# (pg_restore --clean over the upgraded database would leave the new tables and _prisma_migrations behind.)
fresh_db br_rollback
pg_restore --no-owner --no-acl --exit-on-error --dbname="$(db_url br_rollback)" "$WORK_DIR/legacy.dump"
fingerprint br_rollback > "$WORK_DIR/legacy-after.fp"
diff -u "$WORK_DIR/legacy-before.fp" "$WORK_DIR/legacy-after.fp" || fail "rollback database differs from the pre-upgrade state"
test "$(sql br_rollback -Atc "select to_regclass('public.\"Plant\"') is null")" = "t" || fail "rollback still has the Plant table"
echo "rollback restored the exact pre-upgrade state (no Plant tables, no migration history)"

DATABASE_URL="$(db_url br_rollback)" $PRISMA migrate resolve --applied 0_init
DATABASE_URL="$(db_url br_rollback)" $PRISMA migrate deploy
DATABASE_URL="$(db_url br_rollback)" $PRISMA migrate diff --from-url "$(db_url br_rollback)" --to-schema-datamodel prisma/schema.prisma --exit-code
test "$(sql br_rollback -Atc 'select count(*) from "GrowLog"')" = "1" || fail "legacy data lost after re-upgrade"
echo "re-upgrade after rollback succeeded, legacy data intact"

step "Cleanup"
for d in br_source br_restore br_legacy br_rollback; do admin -c "DROP DATABASE IF EXISTS $d WITH (FORCE)"; done
rm -rf "$WORK_DIR"
echo "BACKUP/RESTORE TEST PASSED"
