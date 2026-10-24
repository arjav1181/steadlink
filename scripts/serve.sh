#!/usr/bin/env bash
# Restart the design-system server.
#
# Two traps this script exists to avoid:
#   1. A previous `next start` holding the port serves the OLD .next build
#      and silently invalidates every screenshot. So the port is always freed
#      first, and in prod mode the build directory is always rebuilt.
#   2. `pkill -f next-server` also matches the shell that launched it, because
#      the pattern appears in that shell's own command line. So the PID is
#      tracked in a file and killed by number.
set -euo pipefail

PORT="${PORT:-3210}"
MODE="${MODE:-prod}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="${ROOT}/.dev-server.pid"

cd "$ROOT"

if [ -f "$PIDFILE" ]; then
  OLD_PID="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [ -n "${OLD_PID}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill -9 "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$PIDFILE"
fi

# Belt and braces: free the port even if the PID file was lost. Match on the
# process NAME, not the full command line - `pkill -f next-server` would also
# match the shell running this script, because the pattern is in its own
# command line.
for pid in $(ps -eo pid=,comm= | awk '$2 ~ /^next-server/ {print $1}'); do
  kill -9 "$pid" 2>/dev/null || true
done
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi
sleep 1

if [ "$MODE" = "dev" ]; then
  corepack pnpm --filter @steadlink/web dev &
else
  rm -rf apps/web/.next
  corepack pnpm --filter @steadlink/web build >/dev/null
  corepack pnpm --filter @steadlink/web start &
fi

SERVER_PID=$!
echo "$SERVER_PID" > "$PIDFILE"
echo "serving on http://localhost:${PORT} (pid ${SERVER_PID}, mode ${MODE})"
wait "$SERVER_PID"
