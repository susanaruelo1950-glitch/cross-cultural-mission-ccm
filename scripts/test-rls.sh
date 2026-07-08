#!/usr/bin/env bash
# Runs the RLS test suite against SUPABASE_DB_URL (or PG* env vars).
# Non-zero exit if any assertion fails. Safe: everything runs in a rolled-back tx.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in supabase/tests/rls_*.sql; do
  echo ">> $f"
  psql -v ON_ERROR_STOP=1 -f "$f"
done
echo "All RLS tests passed."
