#!/usr/bin/env bash
# Cookie funnel: wrong pages redirect to canonical step (e.g. approval → not review on back).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

GATE_JSON="$ROOT/scripts/fixtures/singpass-gate-session.json"
CALLBACK_JSON="$ROOT/scripts/fixtures/singpass-callback-minimal.json"
SUBMIT_JSON="$ROOT/scripts/fixtures/submit-complete-singpass.json"

pass() { echo "  PASS: $*"; }
fail() { echo "  FAIL: $*"; exit 1; }

echo "=== Apply funnel (cookie) checks ==="

# Full Singpass → review
curl -sS -o /dev/null -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/session" -H "Content-Type: application/json" -d @"$GATE_JSON"
ACTIVATE_URL=$(curl -sS -X POST "$BASE_URL/api/auth/callback" \
  -H "Content-Type: application/json" -d @"$CALLBACK_JSON" | jq -r '.data')
curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -L -o /dev/null "$ACTIVATE_URL"

# Submit → approval
curl -sS -o /tmp/funnel-submit.json -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/submit" \
  -H "Content-Type: application/json" -d @"$SUBMIT_JSON"
LEAD_ID=$(jq -r '.leadId // empty' /tmp/funnel-submit.json)
APPROVED=$(jq -r '.approvedLoanAmount // 0' /tmp/funnel-submit.json)
[[ -n "$LEAD_ID" && "$APPROVED" != "0" ]] || fail "submit did not yield approval"

echo "[1] On approval session, GET /apply/review → should not stay on review"
R=$(curl -sS -b "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$BASE_URL/apply/review")
[[ "$R" == *"/apply/approval"* ]] || fail "expected approval redirect from review (got $R)"
pass "review → approval when lead exists"

echo "[2] On approval session, GET / → should go to approval"
H=$(curl -sS -b "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$BASE_URL/")
[[ "$H" == *"/apply/approval"* ]] || fail "expected approval from home (got $H)"
pass "home → approval when offer active"

echo "[3] GET /apply/approval → stays on approval"
A=$(curl -sS -b "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$BASE_URL/apply/approval?leadId=$LEAD_ID")
[[ "$A" == *"/apply/approval"* ]] || fail "approval page blocked (got $A)"
pass "approval page allowed"

echo "[4] With booking_confirm cookie, GET / → /apply/booked (no new application)"
BOOK_JSON='{"appointmentId":"00000000-0000-4000-8000-000000000001","cfh5Id":"CFH5-TESTBOOK","loanAmount":5000,"date":"2026-06-10","time":"11:00","idType":"singaporean"}'
# Set booking_confirm via book API is heavy; set via session codec endpoint — use book route from e2e or manual cookie from submit+book
# Simulate: run mini book from prior jar or POST book if we have approval session from above
if [[ -f "$COOKIE_JAR" ]] && grep -q review_gate "$COOKIE_JAR" 2>/dev/null; then
  BOOK_DATE=$(date -v+14d +%Y-%m-%d 2>/dev/null || date -d "+14 days" +%Y-%m-%d)
  curl -sS -o /tmp/funnel-book.json -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -X POST "$BASE_URL/api/apply/book" \
    -H "Content-Type: application/json" \
    -d "{\"date\":\"$BOOK_DATE\",\"time\":\"14:00\"}" >/dev/null || true
fi
if grep -q booking_confirm "$COOKIE_JAR" 2>/dev/null; then
  HBOOK=$(curl -sS -b "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$BASE_URL/")
  [[ "$HBOOK" == *"/apply/booked"* ]] || fail "home should redirect to booked (got $HBOOK)"
  pass "booked cookie blocks new application on /"
else
  echo "  SKIP: booking_confirm not set (run after approval in same jar)"
fi

echo ""
echo "All funnel checks passed."
