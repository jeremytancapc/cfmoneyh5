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
