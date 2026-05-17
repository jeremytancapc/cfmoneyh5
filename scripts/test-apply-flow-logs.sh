#!/usr/bin/env bash
# Simulate the 3 Singpass logging steps without real Singpass.
#
# Prerequisites:
#   1. Migration 20260517000001_create_apply_flow_events.sql applied in Supabase
#   2. .env.local has SUPABASE_SERVICE_ROLE_KEY (+ Supabase URL keys)
#   3. App running: npm run dev   (or set BASE_URL to your Vercel preview)
#
# Usage:
#   ./scripts/test-apply-flow-logs.sh              # happy path (cookie kept)
#   ./scripts/test-apply-flow-logs.sh cookie-lost  # activate without pre-Singpass cookie
#   ./scripts/test-apply-flow-logs.sh empty-myinfo # Lambda returns no myinfo block
#   ./scripts/test-apply-flow-logs.sh full         # uses lib/mock-singpass-payload.json (large cookie)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCENARIO="${1:-happy}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install with: brew install jq"
  exit 1
fi

case "$SCENARIO" in
  happy)
    CALLBACK_JSON="$ROOT/scripts/fixtures/singpass-callback-minimal.json"
    USE_COOKIES=1
    ;;
  cookie-lost)
    CALLBACK_JSON="$ROOT/scripts/fixtures/singpass-callback-minimal.json"
    USE_COOKIES=0
    echo "Scenario: cookie-lost (simulates browser losing apply_session before activate)"
    ;;
  empty-myinfo)
    CALLBACK_JSON="$ROOT/scripts/fixtures/singpass-callback-empty.json"
    USE_COOKIES=1
    echo "Scenario: empty-myinfo (webhook OK but no myinfo object)"
    ;;
  full)
    CALLBACK_JSON="$ROOT/lib/mock-singpass-payload.json"
    USE_COOKIES=1
    echo "Scenario: full mock MyInfo (checks cookie_may_exceed_4kb)"
    ;;
  *)
    echo "Unknown scenario: $SCENARIO"
    echo "Use: happy | cookie-lost | empty-myinfo | full"
    exit 1
    ;;
esac

GATE_JSON="$ROOT/scripts/fixtures/singpass-gate-session.json"

echo "=== Apply flow log test ==="
echo "BASE_URL:  $BASE_URL"
echo "Scenario:  $SCENARIO"
echo ""

# ── Step 1: User taps Singpass (save session + gate) ─────────────────────────
echo "[1/3] POST /api/apply/session  →  event: singpass_gate_saved"
HTTP1=$(curl -sS -o /tmp/apply-flow-step1.json -w "%{http_code}" \
  -c "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/apply/session" \
  -H "Content-Type: application/json" \
  -d @"$GATE_JSON")
echo "      HTTP $HTTP1"
if [[ "$HTTP1" != "200" ]]; then
  cat /tmp/apply-flow-step1.json
  echo ""
  echo "FAILED step 1. Is the dev server running? (npm run dev)"
  exit 1
fi

# ── Step 2: Lambda webhook after Singpass ───────────────────────────────────
echo "[2/3] POST /api/auth/callback  →  event: auth_callback_received"
HTTP2=$(curl -sS -o /tmp/apply-flow-step2.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/auth/callback" \
  -H "Content-Type: application/json" \
  -d @"$CALLBACK_JSON")
echo "      HTTP $HTTP2"
if [[ "$HTTP2" != "200" ]]; then
  cat /tmp/apply-flow-step2.json
  exit 1
fi

ACTIVATE_URL=$(jq -r '.data // empty' /tmp/apply-flow-step2.json)
if [[ -z "$ACTIVATE_URL" ]]; then
  echo "FAILED: callback response missing .data activate URL"
  cat /tmp/apply-flow-step2.json
  exit 1
fi
echo "      activate URL length: ${#ACTIVATE_URL}"

# ── Step 3: Browser opens activate link ─────────────────────────────────────
echo "[3/3] GET /api/apply/activate  →  event: activate_merged"
if [[ "$USE_COOKIES" == "1" ]]; then
  FINAL_URL=$(curl -sS -b "$COOKIE_JAR" -L -o /dev/null -w "%{url_effective}" "$ACTIVATE_URL")
else
  FINAL_URL=$(curl -sS -L -o /dev/null -w "%{url_effective}" "$ACTIVATE_URL")
fi
echo "      Final URL: $FINAL_URL"
if [[ "$FINAL_URL" != *"/apply/review"* ]]; then
  echo "FAILED step 3: expected redirect to /apply/review"
  exit 1
fi

echo ""
echo "Done. Check Supabase table apply_flow_events (newest rows first):"
echo ""
echo "  select created_at, event, apply_trace_id, singpass_raw_key,"
echo "         resume_would_pass, had_existing_session_cookie,"
echo "         cookie_merged_bytes, mobile_last4, nric_last4"
echo "  from apply_flow_events"
echo "  order by created_at desc"
echo "  limit 10;"
echo ""
echo "You should see 3 rows for scenario '$SCENARIO' within the last minute."
if [[ "$SCENARIO" == "cookie-lost" ]]; then
  echo "Expect activate_merged.had_existing_session_cookie = false"
elif [[ "$SCENARIO" == "empty-myinfo" ]]; then
  echo "Expect activate_merged.resume_would_pass = false (no name/nric in token)"
fi
