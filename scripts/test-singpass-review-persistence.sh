#!/usr/bin/env bash
# Singpass → review persistence + cookie budget (regression for 4 KB cookie bug).
#
# Covers:
#   - Pre-MyInfo: tap Singpass only → must NOT reach /apply/review
#   - Post-MyInfo: activate → review sticks on reload, home, alternate landings
#   - Back button: DELETE /api/apply/session → home, review blocked
#   - Large MyInfo (30 CPF): session cookie must round-trip (fails until cookie slimming)
#
# Usage:
#   ./scripts/test-singpass-review-persistence.sh
#   ./scripts/test-singpass-review-persistence.sh minimal   # skip large-payload section
#
# Requires: jq, dev server on BASE_URL, node 22+

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCENARIO="${1:-full}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

GATE_JSON="$ROOT/scripts/fixtures/singpass-gate-session.json"
MINIMAL_CALLBACK="$ROOT/scripts/fixtures/singpass-callback-minimal.json"
LARGE_CALLBACK="$ROOT/scripts/fixtures/singpass-callback-production-scale.json"
INSPECT="$ROOT/scripts/helpers/inspect-cookie-jar.ts"

pass() { echo "  PASS: $*"; }
fail() { echo "  FAIL: $*"; exit 1; }
skip() { echo "  SKIP: $*"; }

inspect_session() {
  node --experimental-strip-types "$INSPECT" "$COOKIE_JAR" 2>/dev/null
}

assert_on_review() {
  local label="$1"
  local url
  url=$(curl -sS -b "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$2")
  [[ "$url" == *"/apply/review"* ]] || fail "$label — expected /apply/review (got $url)"
  pass "$label"
}

assert_not_review() {
  local label="$1"
  local url
  url=$(curl -sS -b "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$2")
  [[ "$url" != *"/apply/review"* ]] || fail "$label — must not stay on review (got $url)"
  pass "$label"
}

run_activate_flow() {
  local callback_json="$1"
  rm -f "$COOKIE_JAR"

  curl -sS -o /dev/null -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -X POST "$BASE_URL/api/apply/session" \
    -H "Content-Type: application/json" \
    -d @"$GATE_JSON"

  local activate_url
  activate_url=$(curl -sS -X POST "$BASE_URL/api/auth/callback" \
    -H "Content-Type: application/json" \
    -d @"$callback_json" | jq -r '.data')
  [[ -n "$activate_url" && "$activate_url" != "null" ]] || fail "no activate URL from callback"

  local final
  final=$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$activate_url")
  [[ "$final" == *"/apply/review"* ]] || fail "activate did not land on review (got $final)"
}

echo "=== Singpass review persistence ==="
echo "BASE_URL:  $BASE_URL"
echo "Scenario:  $SCENARIO"
echo ""

# ── A) Pre-MyInfo: Singpass tap only ─────────────────────────────────────────
echo "[A] Pre-MyInfo Singpass tap (setApplyGate=false)"
rm -f "$COOKIE_JAR"
HTTP=$(curl -sS -o /dev/null -w "%{http_code}" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/session" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --argjson fd "$(cat "$GATE_JSON" | jq '.formData')" \
    '{ formData: ($fd + {authMethod: "singpass"}), gate: "apply", setApplyGate: false }')")
[[ "$HTTP" == "200" ]] || fail "session save HTTP $HTTP"

grep -q 'apply_gate' "$COOKIE_JAR" && fail "apply_gate set before MyInfo returns"
pass "no apply_gate before MyInfo"

assert_not_review "home without MyInfo" "$BASE_URL/"
assert_not_review "direct /apply/review without gate+MyInfo" "$BASE_URL/apply/review"

# ── B) Post-MyInfo minimal payload — review stickiness ───────────────────────
echo ""
echo "[B] Post-MyInfo (minimal payload) — review must persist"
run_activate_flow "$MINIMAL_CALLBACK"
pass "activate lands on /apply/review"

grep -q 'apply_gate' "$COOKIE_JAR" || fail "apply_gate missing after activate"
pass "apply_gate set after activate"

STATS=$(inspect_session)
echo "      session: $STATS"
echo "$STATS" | jq -e '.decodeOk == true and .canEnterReview == true' >/dev/null \
  || fail "minimal session does not decode or cannot enter review"

assert_on_review "reload /apply/review" "$BASE_URL/apply/review"
assert_on_review "GET / → review" "$BASE_URL/"
assert_on_review "GET /foreigner → review" "$BASE_URL/foreigner"
assert_on_review "GET /apply/approval → review (pre-submit)" "$BASE_URL/apply/approval"

# ── C) Back button — clear session, return to landing ───────────────────────
echo ""
echo "[C] Back button (DELETE session) — must leave review funnel"
HTTP_DEL=$(curl -sS -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X DELETE "$BASE_URL/api/apply/session")
[[ "$HTTP_DEL" == "200" ]] || fail "DELETE session HTTP $HTTP_DEL"
pass "DELETE /api/apply/session OK"

assert_not_review "home after clear" "$BASE_URL/"
assert_not_review "/apply/review blocked after clear" "$BASE_URL/apply/review"

# ── D) Manual gate — can enter review without MyInfo ─────────────────────────
echo ""
echo "[D] Manual flow — review without MyInfo, clear still works"
rm -f "$COOKIE_JAR"
curl -sS -o /dev/null -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/session" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --argjson fd "$(cat "$GATE_JSON" | jq '.formData')" \
    '{ formData: ($fd + {authMethod: "manual"}), gate: "apply", setApplyGate: true }')"

assert_on_review "manual gate → review" "$BASE_URL/apply/review"

curl -sS -o /dev/null -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X DELETE "$BASE_URL/api/apply/session"
assert_not_review "manual: home after back/clear" "$BASE_URL/"

# ── E) Large MyInfo — cookie budget regression (production bug) ──────────────
echo ""
if [[ "$SCENARIO" == "minimal" ]]; then
  skip "large MyInfo section (run without 'minimal' to include)"
else
  echo "[E] Production-scale MyInfo (29 CPF rows) — cookie must round-trip after activate"
  run_activate_flow "$LARGE_CALLBACK"

  STATS=$(inspect_session)
  echo "      session: $STATS"

  echo "$STATS" | jq -e '.decodeOk == true' >/dev/null \
    || fail "large payload: apply_session missing or corrupt in cookie jar"
  pass "large payload: apply_session decodes"

  echo "$STATS" | jq -e '.hasNric == true and .hasFullName == true' >/dev/null \
    || fail "large payload: MyInfo identity not in session cookie"
  pass "large payload: NRIC + name present in session"

  echo "$STATS" | jq -e '.exceedsBrowserMax == false' >/dev/null \
    || fail "large payload: session cookie exceeds ${BROWSER_COOKIE_MAX:-4096} bytes — customer will bounce to home (see apply_flow_events.cookie_may_exceed_4kb)"
  pass "large payload: cookie under browser limit"

  echo "$STATS" | jq -e '.canEnterReview == true' >/dev/null \
    || fail "large payload: canEnterReview false — funnel will redirect away from review"

  assert_on_review "large: reload /apply/review" "$BASE_URL/apply/review"
  assert_on_review "large: GET / → review" "$BASE_URL/"
fi

echo ""
echo "All Singpass review persistence checks passed."
