#!/usr/bin/env bash
#
# Start the application for the end-to-end suite.
#
#   scripts/e2e-server.sh
#
# The database is put into a known state first, so every run of the suite
# starts from the same rows. The application runs against that database as
# the unprivileged `steadlink` role, which is the role it runs as in the Docker
# deployment. That matters: with the superuser the row level security
# policies do not apply, so a query that forgot to scope itself would look
# fine here and leak in production.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${E2E_DATABASE_URL:-postgres://steadlink:steadlink@127.0.0.1:55440/steadlink_test}"
export DATABASE_MIGRATION_URL="${E2E_MIGRATION_URL:-postgres://postgres:postgres@127.0.0.1:55440/steadlink_test}"
export DATABASE_APP_ROLE=steadlink
export BETTER_AUTH_SECRET="${E2E_BETTER_AUTH_SECRET:-steadlink-e2e-secret-not-used-anywhere-else}"
export BETTER_AUTH_URL="http://127.0.0.1:${E2E_PORT:-3311}"
export APP_URL="http://127.0.0.1:${E2E_PORT:-3311}"
export DEFAULT_SHORT_DOMAIN="${DEFAULT_SHORT_DOMAIN:-go.arjav.is-cool.dev}"
export PORT="${E2E_PORT:-3311}"
export HOST=127.0.0.1
export NODE_ENV=production

node --experimental-strip-types scripts/e2e-reset.ts

# The suite runs against a production build, so the pages it loads are the
# pages that are deployed. The build needs no secret: the application reads
# it at run time, not at build time.
if [ "${E2E_SKIP_BUILD:-0}" != "1" ]; then
  echo "building the application"
  pnpm --filter @steadlink/web build
fi

# The server runs from the application's own directory: Next looks for the
# build in the current working directory, and the build lives in
# apps/web/.next.
exec pnpm --filter @steadlink/web start
