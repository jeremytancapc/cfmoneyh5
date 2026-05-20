#!/usr/bin/env bash
# Verify Singpass gate behaviour (bug: back from Singpass must not reach /apply/review).
#
# Usage: ./scripts/test-singpass-gate.sh
# Requires: jq, dev server on BASE_URL

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

GATE_JSON="$ROOT/scripts/fixtures/singpass-gate-session.json"

pass() { echo "  PASS: $*"; }
fail() { echo "  FAIL: $*"; exit 1; }

echo "=== Singpass gate checks ==="
echo "BASE_URL: $BASE_URL"
echo ""

# ── A) Tap Singpass only (setApplyGate: false) — must NOT reach review ───────
echo "[A] POST session with authMethod=singpass, setApplyGate=false"
HTTP=$(curl -sS -o /tmp/sg-a.json -w "%{http_code}" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/session" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --argjson fd "$(cat "$GATE_JSON" | jq '.formData')" \
    '{ formData: ($fd + {authMethod: "singpass"}), gate: "apply", setApplyGate: false }')")
[[ "$HTTP" == "200" ]] || fail "session save HTTP $HTTP"

HAS_GATE=$(grep -c 'apply_gate' "$COOKIE_JAR" 2>/dev/null || true)
if [[ "$HAS_GATE" -gt 0 ]]; then
  fail "apply_gate cookie was set when setApplyGate=false"
fi
pass "no apply_gate after Singpass tap (pre-MyInfo)"

echo "[A] GET / — must NOT redirect to /apply/review"
HOME_URL=$(curl -sS -b "$COOKIE_JAR" -o /tmp/sg-home.html -w "%{url_effective}" "$BASE_URL/")
[[ "$HOME_URL" != *"/apply/review"* ]] || fail "home redirected to review without MyInfo (got $HOME_URL)"
pass "home stays on / when Singpass not completed"

echo "[A] GET /apply/review — proxy must block (no apply_gate)"
REVIEW_HTTP=$(curl -sS -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" -L "$BASE_URL/apply/review")
REVIEW_FINAL=$(curl -sS -b "$COOKIE_JAR" -o /dev/null -w "%{url_effective}" -L "$BASE_URL/apply/review")
if [[ "$REVIEW_FINAL" == *"/apply/review"* ]]; then
  fail "reached /apply/review without apply_gate (HTTP $REVIEW_HTTP)"
fi
pass "cannot access /apply/review without gate (final: $REVIEW_FINAL)"

# ── B) Full Singpass path — must reach review after activate ─────────────────
echo ""
echo "[B] Full flow: session → callback → activate"
rm -f "$COOKIE_JAR"
CALLBACK_JSON="$ROOT/scripts/fixtures/singpass-callback-minimal.json"

curl -sS -o /dev/null -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/session" \
  -H "Content-Type: application/json" \
  -d @"$GATE_JSON"

ACTIVATE_URL=$(curl -sS -X POST "$BASE_URL/api/auth/callback" \
  -H "Content-Type: application/json" \
  -d @"$CALLBACK_JSON" | jq -r '.data')
[[ -n "$ACTIVATE_URL" && "$ACTIVATE_URL" != "null" ]] || fail "no activate URL from callback"

FINAL=$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$ACTIVATE_URL")
[[ "$FINAL" == *"/apply/review"* ]] || fail "activate did not land on review (got $FINAL)"
pass "activate lands on /apply/review"

grep -q 'apply_gate' "$COOKIE_JAR" || fail "apply_gate missing after activate"
pass "apply_gate set after activate"

echo "[B] GET / — should redirect to review (gate + MyInfo in session)"
HOME2=$(curl -sS -b "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$BASE_URL/")
[[ "$HOME2" == *"/apply/review"* ]] || fail "home did not continue to review after MyInfo (got $HOME2)"
pass "home auto-continues to review after MyInfo"

echo ""
echo "All Singpass gate checks passed."
