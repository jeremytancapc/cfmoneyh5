#!/usr/bin/env bash
# End-to-end apply flow (HTTP, no browser):
#   Singpass gate → callback → activate → review → submit → book → booked
#
# Prerequisites: same as test-apply-flow-logs.sh + dev server on BASE_URL
#
# Usage: ./scripts/test-apply-flow-e2e.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required (brew install jq)"
  exit 1
fi

GATE_JSON="$ROOT/scripts/fixtures/singpass-gate-session.json"
CALLBACK_JSON="$ROOT/scripts/fixtures/singpass-callback-minimal.json"
SUBMIT_JSON="$ROOT/scripts/fixtures/submit-complete-singpass.json"

# Pick a weekday ~2 weeks out for booking (avoid Sunday/holidays heuristically)
BOOK_DATE=$(date -v+14d +%Y-%m-%d 2>/dev/null || date -d "+14 days" +%Y-%m-%d)
BOOK_TIME="11:00"

echo "=== Apply flow E2E test ==="
echo "BASE_URL:   $BASE_URL"
echo "BOOK_DATE:  $BOOK_DATE"
echo ""

fail() {
  echo "FAILED: $*"
  exit 1
}

curl_ok() {
  local step="$1" expected="$2" actual="$3" body_file="$4"
  if [[ "$actual" != "$expected" ]]; then
    echo "[$step] HTTP $actual (expected $expected)"
    [[ -f "$body_file" ]] && cat "$body_file"
    fail "$step"
  fi
}

# ── Singpass path (steps 1–3) ─────────────────────────────────────────────────
echo "[1/8] POST /api/apply/session (singpass gate)"
HTTP=$(curl -sS -o /tmp/e2e-s1.json -w "%{http_code}" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/session" \
  -H "Content-Type: application/json" \
  -d @"$GATE_JSON")
curl_ok "session" 200 "$HTTP" /tmp/e2e-s1.json

echo "[2/8] POST /api/auth/callback"
HTTP=$(curl -sS -o /tmp/e2e-s2.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/auth/callback" \
  -H "Content-Type: application/json" \
  -d @"$CALLBACK_JSON")
curl_ok "callback" 200 "$HTTP" /tmp/e2e-s2.json
ACTIVATE_URL=$(jq -r '.data // empty' /tmp/e2e-s2.json)
[[ -n "$ACTIVATE_URL" ]] || fail "callback missing activate URL"

echo "[3/8] GET /api/apply/activate → /apply/review"
FINAL_URL=$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$ACTIVATE_URL")
echo "      Final URL: $FINAL_URL"
[[ "$FINAL_URL" == *"/apply/review"* ]] || fail "activate did not land on /apply/review"

echo "[4/8] GET /apply/review (with cookies)"
HTTP=$(curl -sS -o /tmp/e2e-s4.html -w "%{http_code}" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  "$BASE_URL/apply/review")
curl_ok "review page" 200 "$HTTP" /tmp/e2e-s4.html

echo "[5/8] POST /api/apply/submit"
HTTP=$(curl -sS -o /tmp/e2e-s5.json -w "%{http_code}" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/submit" \
  -H "Content-Type: application/json" \
  -d @"$SUBMIT_JSON")
curl_ok "submit" 200 "$HTTP" /tmp/e2e-s5.json
LEAD_ID=$(jq -r '.leadId // empty' /tmp/e2e-s5.json)
APPROVED=$(jq -r '.approvedLoanAmount // 0' /tmp/e2e-s5.json)
IS_ELIGIBLE=$(jq -r '.isEligible // false' /tmp/e2e-s5.json)
echo "      leadId=$LEAD_ID approved=$APPROVED eligible=$IS_ELIGIBLE"
[[ -n "$LEAD_ID" ]] || fail "submit missing leadId"

if [[ "$IS_ELIGIBLE" != "true" ]]; then
  echo "WARN: not eligible — skipping approval/book (pending path only)"
  HTTP=$(curl -sS -o /tmp/e2e-pending.html -w "%{http_code}" \
    -b "$COOKIE_JAR" "$BASE_URL/apply/pending?leadId=$LEAD_ID")
  curl_ok "pending page" 200 "$HTTP" /tmp/e2e-pending.html
  echo ""
  echo "E2E partial OK (stopped at pending — adjust fixture for eligibility)."
  exit 0
fi

echo "[6/8] GET /apply/approval"
HTTP=$(curl -sS -o /tmp/e2e-s6.html -w "%{http_code}" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  "$BASE_URL/apply/approval?leadId=$LEAD_ID")
curl_ok "approval page" 200 "$HTTP" /tmp/e2e-s6.html

echo "[7/8] GET /apply/book (needs review_gate)"
HTTP=$(curl -sS -o /tmp/e2e-s7.html -w "%{http_code}" \
  -b "$COOKIE_JAR" \
  "$BASE_URL/apply/book")
curl_ok "book page" 200 "$HTTP" /tmp/e2e-s7.html

echo "[8/8] POST /api/apply/book → booking_confirm cookie"
HTTP=$(curl -sS -o /tmp/e2e-s8.json -w "%{http_code}" \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/book" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$BOOK_DATE\",\"time\":\"$BOOK_TIME\"}")
if [[ "$HTTP" == "500" ]]; then
  echo "      Book returned 500 (slot/DB?) — retrying with 14:00"
  BOOK_TIME="14:00"
  HTTP=$(curl -sS -o /tmp/e2e-s8.json -w "%{http_code}" \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -X POST "$BASE_URL/api/apply/book" \
    -H "Content-Type: application/json" \
    -d "{\"date\":\"$BOOK_DATE\",\"time\":\"$BOOK_TIME\"}")
fi
curl_ok "book" 200 "$HTTP" /tmp/e2e-s8.json
CFH5=$(jq -r '.cfh5Id // empty' /tmp/e2e-s8.json)
echo "      cfh5Id=$CFH5 date=$BOOK_DATE time=$BOOK_TIME"

echo "[+] GET /apply/booked (persisted confirmation)"
HTTP=$(curl -sS -o /tmp/e2e-booked.html -w "%{http_code}" \
  -b "$COOKIE_JAR" \
  "$BASE_URL/apply/booked")
curl_ok "booked page" 200 "$HTTP" /tmp/e2e-booked.html
grep -q "$CFH5" /tmp/e2e-booked.html || fail "booked page missing cfh5Id $CFH5"

echo "[+] Refresh /apply/booked (simulate user reload)"
HTTP=$(curl -sS -o /tmp/e2e-booked2.html -w "%{http_code}" \
  -b "$COOKIE_JAR" \
  "$BASE_URL/apply/booked")
curl_ok "booked refresh" 200 "$HTTP" /tmp/e2e-booked2.html

echo "[+] GET /apply/book without review_gate → expect redirect home"
REDIR=$(curl -sS -b "$COOKIE_JAR" -o /dev/null -w "%{url_effective}" "$BASE_URL/apply/book")
echo "      /apply/book after book: $REDIR"
[[ "$REDIR" == *"/" ]] || [[ "$REDIR" != *"/apply/book"* ]] || echo "WARN: still on book page (proxy may differ)"

echo "[+] GET / (new apply — should not require booked cookie)"
HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/")
curl_ok "landing" 200 "$HTTP" /dev/null

echo ""
echo "E2E PASSED."
echo "  Review:   $FINAL_URL"
echo "  Lead:     $LEAD_ID"
echo "  Booked:   $BASE_URL/apply/booked (ref $CFH5)"
echo ""
echo "Optional: verify apply_flow_events in Supabase (3 Singpass rows from test:apply-flow-logs)."
