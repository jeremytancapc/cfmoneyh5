# Supabase Database Management

All schema changes live in `supabase/migrations/` as plain `.sql` files **committed to git**.  
This means the schema can never be lost — any developer or environment can recreate the entire database by running the files in order.

---

## Migration files

| File | What it creates |
|------|----------------|
| `20260512000001_create_enums.sql` | Postgres enum types shared across tables |
| `20260512000002_create_leads.sql` | `leads` table + RLS + indexes + `set_updated_at` trigger |
| `20260512000003_create_myinfo_profiles.sql` | `myinfo_profiles` table (1-to-1 with leads) |
| `20260512000004_create_appointments.sql` | `appointments` table + unique slot constraint |
| `20260512000005_rls_anon_write_policies.sql` | RLS INSERT policies for the publishable key |
| `20260512000006_create_credit_assessments.sql` | `credit_assessments` table — scoring audit trail |
| `20260517000001_create_apply_flow_events.sql` | `apply_flow_events` — Singpass / apply funnel diagnostics (production support) |
| `20260522000001_apply_flow_events_rls_policy.sql` | RLS policy on `apply_flow_events` (matches `leads`; fixes insert failures) |
| `20260522000002_leads_add_in_progress_status.sql` | Adds `in_progress` to `lead_status` enum for partial leads captured before final submit |

---

## Singpass flow logs (`apply_flow_events`)

Production/stg Route Handlers write one row per funnel step when a customer uses Singpass:

| `event` | When |
|---------|------|
| `singpass_gate_saved` | User taps Singpass on step 3 (`POST /api/apply/session`) |
| `auth_callback_received` | Lambda webhook after MyInfo (`POST /api/auth/callback`) |
| `activate_merged` | Browser returns (`GET /api/apply/activate`) |

**Apply the migration** (SQL Editor or `supabase db push`) before deploying the app code that logs to this table.

If Vercel logs show `[apply-flow-log] insert failed … row-level security policy for table "apply_flow_events"` while `leads` inserts work, run migration `20260522000001_apply_flow_events_rls_policy.sql` on that project and confirm `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** secret (not the publishable/anon key).

### Investigating a customer complaint

1. Open **Supabase → Table Editor → `apply_flow_events`** (or SQL Editor).
2. Narrow by **time** (Singapore time → store as UTC in `created_at`).
3. Optional filters:
   - **Mobile**: `mobile_last4` = last 4 digits of their number (e.g. `9380`).
   - **NRIC**: `nric_last4` = last 4 characters of NRIC (e.g. `123A`).
4. For one journey, sort by `created_at` and match rows using:
   - `apply_trace_id` — set at Singpass gate, should appear on `singpass_gate_saved` and `activate_merged` if the pre-Singpass cookie survived.
   - `singpass_raw_key` — links `auth_callback_received` to `activate_merged`.

**Example — by time and phone last 4:**

```sql
select
  created_at,
  event,
  trace_id,
  apply_trace_id,
  singpass_raw_key,
  resume_would_pass,
  cookie_merged_bytes,
  cookie_may_exceed_4kb,
  had_existing_session_cookie,
  token_decode_ok,
  details
from public.apply_flow_events
where created_at >= timestamptz '2026-05-17 05:00:00+00'  -- adjust window
  and created_at <  timestamptz '2026-05-17 07:00:00+00'
  and mobile_last4 = '9380'
order by created_at;
```

**Example — full trace for one `apply_trace_id`:**

```sql
select created_at, event, resume_would_pass, cookie_merged_bytes, details
from public.apply_flow_events
where apply_trace_id = '00000000-0000-0000-0000-000000000000'
order by created_at;
```

**Example — recent activations where resume would fail** (landed on home step 1 instead of review):

```sql
select created_at, apply_trace_id, mobile_last4, nric_last4,
       had_existing_session_cookie, cookie_merged_bytes, details
from public.apply_flow_events
where event = 'activate_merged'
  and resume_would_pass = false
order by created_at desc
limit 50;
```

### How to read key columns

| Column | Meaning |
|--------|---------|
| `had_existing_session_cookie` | `false` → loan amount / income from before Singpass were probably lost at merge |
| `cookie_merged_bytes` / `cookie_may_exceed_4kb` | Large MyInfo session may fail to save in the browser |
| `resume_would_pass` | Whether home page *would* jump to review (diagnostic only) |
| `details.session_before` / `session_after` | Flags only (no full NRIC/name stored in logs) |

No full NRIC, name, or mobile is stored — only `*_last4` suffixes when available after MyInfo.

---

## Testing flow logs (step by step)

Logging only works when **both** are true: the migration is applied in Supabase, and the app has `SUPABASE_SERVICE_ROLE_KEY` (local `.env.local` or Vercel env). If you tested real Singpass but see **zero rows**, one of those is usually missing.

### What gets logged (simple picture)

```
You tap Singpass          →  singpass_gate_saved
Lambda gets MyInfo        →  auth_callback_received   (server webhook, no browser)
Browser opens return URL  →  activate_merged
```

Real Singpass on the website runs the same three steps; after activate the browser should land on **`/apply/review`** (not `/`). The test script below fakes steps 1–3 with `curl` so you do not need Singpass.

### Option A — Automated script (recommended)

```bash
# Terminal 1
npm run dev

# Terminal 2 (after migration is applied to the Supabase project in .env.local)
npm run test:apply-flow-logs
```

Other scenarios:

| Command | What it simulates |
|---------|-------------------|
| `npm run test:apply-flow-logs` | Normal return; cookie kept → `resume_would_pass` usually **true** |
| `npm run test:apply-flow-logs:cookie-lost` | Lost `apply_session` before activate → `had_existing_session_cookie` **false** |
| `npm run test:apply-flow-logs:empty` | Webhook with no `myinfo` → `resume_would_pass` usually **false** |
| `npm run test:apply-flow-logs:full` | Full mock payload → watch `cookie_may_exceed_4kb` |

Test against Vercel instead of localhost:

```bash
BASE_URL=https://your-production-or-stg.vercel.app npm run test:apply-flow-logs
```

Then in Supabase SQL Editor:

```sql
select created_at, event, apply_trace_id, singpass_raw_key,
       resume_would_pass, had_existing_session_cookie, cookie_merged_bytes
from apply_flow_events
order by created_at desc
limit 10;
```

You should see **exactly 3 new rows** per script run.

### Option B — Manual payloads (copy/paste)

**1) Singpass gate** — `POST /api/apply/session`

File: `scripts/fixtures/singpass-gate-session.json`

```bash
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/apply/session \
  -H "Content-Type: application/json" \
  -d @scripts/fixtures/singpass-gate-session.json
```

**2) Lambda callback** — `POST /api/auth/callback`

Minimal MyInfo (good for local tests):

```bash
curl -X POST http://localhost:3000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d @scripts/fixtures/singpass-callback-minimal.json
```

Copy the `"data"` URL from the JSON response (the activate link).

Empty MyInfo (complaint-like: returned but no identity):

```bash
curl -X POST http://localhost:3000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d @scripts/fixtures/singpass-callback-empty.json
```

Full staging-shaped payload (large cookie test):

```bash
curl -X POST http://localhost:3000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d @lib/mock-singpass-payload.json
```

**3) Browser return** — `GET` the activate URL from step 2

```bash
# Use cookies from step 1 so had_existing_session_cookie = true
curl -b /tmp/cookies.txt -L "PASTE_ACTIVATE_URL_HERE"
```

### Option C — You already tested real Singpass

After you complete Singpass on production/stg:

1. Note the **time** (Singapore) and your mobile **last 4 digits**.
2. Supabase → `apply_flow_events` → sort `created_at` desc.
3. Look for 3 events within ~1–2 minutes.

| Rows you see | Likely meaning |
|--------------|----------------|
| **3 rows** | Logging works; use columns to see why UI misbehaved |
| **1 row** (`auth_callback` only) | Gate or activate not hit, or different Supabase project than Vercel env |
| **0 rows** | Migration not applied, or `SUPABASE_SERVICE_ROLE_KEY` missing on Vercel |

Link rows with the same `singpass_raw_key` on callback + activate. `apply_trace_id` should match gate + activate if the cookie survived.

### Fixture files

| File | Purpose |
|------|---------|
| `scripts/fixtures/singpass-gate-session.json` | Body for step 1 |
| `scripts/fixtures/singpass-callback-minimal.json` | Small fake MyInfo |
| `scripts/fixtures/singpass-callback-empty.json` | Webhook with no `myinfo` |
| `lib/mock-singpass-payload.json` | Full Singpass-shaped payload (existing) |

---

## Apply migrations to Supabase

### Option A — Supabase Dashboard (recommended for free tier)

1. Open [SQL Editor](https://supabase.com/dashboard/project/hncrcgmgypqvajflezxb/sql/new)
2. Paste and run each migration file **in order** (001 → 002 → 003 → 004)
3. Done — your tables are live

### Option B — Supabase CLI (best for teams / CI)

```bash
# Install CLI (once)
npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref hncrcgmgypqvajflezxb

# Push all pending migrations
supabase db push
```

---

## Adding a new migration

**Never edit existing migration files.** Always add a new file:

```bash
# Name format: YYYYMMDDHHMMSS_describe_change.sql
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_add_column_to_leads.sql
```

Write the forward-only SQL inside, commit it, then run it via Dashboard or CLI.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Dashboard → Settings → API → **Publishable** key (formerly "anon") |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → `service_role` key (**keep secret**, optional but recommended for production) |

---

## Row-Level Security (RLS)

All tables have RLS **enabled** with a "service role full access" policy.  
This means:
- The **anon client** (`supabase` from `lib/supabase/client.ts`) cannot read or write any data by default — safe to use in client components without leaking data.
- The **admin client** (`createAdminClient()`) uses the `service_role` key which bypasses RLS — only use it in Route Handlers or Server Actions.

---

## Recreating the database from scratch

If you ever need to reset (e.g. new Supabase project):

1. Create a new Supabase project
2. Update `NEXT_PUBLIC_SUPABASE_URL` and keys in your `.env` files
3. Run all migrations in order via the SQL Editor or `supabase db push`

Your schema is fully preserved in git — nothing is ever lost.
