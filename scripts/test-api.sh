#!/usr/bin/env bash
# Exercise the public API the way a script would.
#
#   ./scripts/test-api.sh [base-url]
#
# It mints a token, then reads and writes through every v4 route, and says
# what worked. A failure prints the body, because a status code alone does
# not say what went wrong.
set -uo pipefail

BASE="${1:-http://localhost:3210}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! TOKEN="$(cd "$ROOT" && node --experimental-strip-types packages/data/src/mint-key.ts 2>/dev/null | tail -1)"; then
  echo "could not mint a token" >&2
  exit 1
fi
if [ -z "$TOKEN" ]; then
  echo "could not mint a token" >&2
  exit 1
fi

PASS=0
FAIL=0
STAMP="$(date +%s)"

call() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    # A body that starts with an @ is a file name. A big body does not fit
    # on a command line, and a design that is too large is the case that
    # needs one.
    case "$body" in
      @*)
        curl -s -X "$method" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
          --data-binary "@${body#@}" -w '\n%{http_code}' "$BASE$path"
        ;;
      *)
        curl -s -X "$method" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
          -d "$body" -w '\n%{http_code}' "$BASE$path"
        ;;
    esac
  else
    curl -s -X "$method" -H "Authorization: Bearer $TOKEN" -w '\n%{http_code}' "$BASE$path"
  fi
}

expect() {
  local label="$1" method="$2" path="$3" want="$4" body="${5:-}"
  local out code payload
  out="$(call "$method" "$path" "$body")"
  code="$(printf '%s' "$out" | tail -n1)"
  payload="$(printf '%s' "$out" | sed '$d')"
  if [ "$code" = "$want" ]; then
    PASS=$((PASS + 1))
    printf '  ok    %-46s %s\n' "$label" "$code"
  else
    FAIL=$((FAIL + 1))
    printf '  FAIL  %-46s %s (wanted %s)\n' "$label" "$code" "$want"
    printf '        %s\n' "$(printf '%s' "$payload" | head -c 220)"
  fi
}

echo "reading"
expect "GET  /api/v4/user"            GET  "/api/v4/user"            200
expect "GET  /api/v4/links"           GET  "/api/v4/links"           200
expect "GET  /api/v4/links?limit=1"  GET  "/api/v4/links?limit=1"  200
expect "GET  /api/v4/groups"          GET  "/api/v4/groups"          200
expect "GET  /api/v4/campaigns"       GET  "/api/v4/campaigns"       200
expect "GET  /api/v4/qr-codes"        GET  "/api/v4/qr-codes"        200
expect "GET  /api/v4/pages"           GET  "/api/v4/pages"           200
expect "GET  /api/v4/expand"          GET  "/api/v4/expand?url=summer" 200

echo "writing"
expect "POST /api/v4/links"           POST "/api/v4/links"           201 \
  "{\"long_url\":\"https://example.org/a-page-that-does-not-exist\",\"custom_back_half\":\"api-test-$STAMP\",\"title\":\"API test\",\"tags\":[\"api\"]}"
expect "POST /api/v4/links (no url)"  POST "/api/v4/links"           400 '{"title":"nothing"}'
expect "POST /api/v4/links (bad url)" POST "/api/v4/links"           400 '{"long_url":"not a url"}'
expect "GET  /api/v4/links/created"   GET  "/api/v4/links"           200

LINK_ID="$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/v4/links?limit=100" \
  | grep -oE '"id":"[0-9a-f-]{36}","link":"[^"]*a-page-that-does-not-exist"' \
  | head -1 | grep -oE '[0-9a-f-]{36}')"
if [ -z "$LINK_ID" ]; then
  LINK_ID="$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/v4/links?limit=100" \
    | tr '{' '\n' | grep "a-page-that-does-not-exist" | head -1 | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')"
fi

if [ -n "$LINK_ID" ]; then
  expect "GET  /api/v4/links/{id}"     GET  "/api/v4/links/$LINK_ID"        200
  expect "PATCH /api/v4/links/{id}"   PATCH "/api/v4/links/$LINK_ID"       200 '{"title":"Renamed by the API test","tags":["api","renamed"]}'
  expect "GET  /api/v4/links/{id}/clicks"  GET "/api/v4/links/$LINK_ID/clicks" 200
  expect "GET  /api/v4/links/{id}/export" GET "/api/v4/links/$LINK_ID/export" 200
  expect "GET  /api/v4/links/{id} (404)" GET "/api/v4/links/00000000-0000-0000-0000-000000000000" 404
else
  echo "  skip  the created link was not found in the listing"
  FAIL=$((FAIL + 1))
fi

expect "POST /api/v4/groups"          POST "/api/v4/groups"          201 "{\"name\":\"API test group $STAMP\"}"
expect "POST /api/v4/groups (no name)" POST "/api/v4/groups"          400 '{}'
expect "POST /api/v4/campaigns"       POST "/api/v4/campaigns"       201 "{\"name\":\"API test campaign $STAMP\",\"channels\":[\"email\",\"social\"]}"
expect "POST /api/v4/campaigns (no channel)" POST "/api/v4/campaigns" 400 '{"name":"lonely"}'
expect "POST /api/v4/qr-codes"        POST "/api/v4/qr-codes"        201 "{\"long_url\":\"https://example.org/qr\",\"custom_back_half\":\"api-qr-$STAMP\"}"
# A design carries a logo, and a logo is a picture. The browser checks
# the size; the server has to check it too, because the server is what
# writes the row.
BIG_DESIGN_FILE="$ROOT/.api-big-design.json"
{
  printf '{"long_url":"https://example.org/big","design":{"logo":"data:image/png;base64,'
  head -c 200000 /dev/zero | base64 -w0
  printf '"}}'
} > "$BIG_DESIGN_FILE"
expect "POST /api/v4/qr-codes (a design too large)" POST "/api/v4/qr-codes" 400 "@$BIG_DESIGN_FILE"
rm -f "$BIG_DESIGN_FILE"
expect "POST /api/v4/pages"           POST "/api/v4/pages"           201 "{\"title\":\"API test page $STAMP\"}"

echo "refusing"
NOBODY="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/v4/links")"
[ "$NOBODY" = "401" ] && { PASS=$((PASS + 1)); printf '  ok    %-46s %s\n' "GET  /api/v4/links without a token" 401; } \
  || { FAIL=$((FAIL + 1)); printf '  FAIL  %-46s %s (wanted 401)\n' "GET  /api/v4/links without a token" "$NOBODY"; }

BADTOKEN="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer gl_not-a-real-token" "$BASE/api/v4/links")"
[ "$BADTOKEN" = "401" ] && { PASS=$((PASS + 1)); printf '  ok    %-46s %s\n' "GET  /api/v4/links with a bad token" 401; } \
  || { FAIL=$((FAIL + 1)); printf '  FAIL  %-46s %s (wanted 401)\n' "GET  /api/v4/links with a bad token" "$BADTOKEN"; }

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
