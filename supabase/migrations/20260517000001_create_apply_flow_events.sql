-- Migration: apply_flow_events — end-to-end Singpass / apply funnel diagnostics
-- Written by Route Handlers via service_role only (no anon policies).

create table public.apply_flow_events (
  id                        uuid primary key default gen_random_uuid(),
  created_at                timestamptz not null default now(),

  -- Correlation: reuse apply_trace_id from session when available; otherwise a new id per row.
  trace_id                  uuid not null,

  event                     text not null,
  environment               text,
  vercel_deployment_id      text,

  singpass_raw_key          uuid,
  apply_trace_id            uuid,

  -- Support lookup (last 4 only — never store full NRIC/mobile)
  mobile_last4              text,
  nric_last4                text,

  had_existing_session_cookie boolean not null default false,
  had_activate_token          boolean not null default false,
  token_decode_ok             boolean,
  had_apply_gate_cookie       boolean,

  cookie_existing_bytes       integer,
  cookie_token_bytes          integer,
  cookie_merged_bytes         integer,
  cookie_may_exceed_4kb       boolean,

  resume_would_pass           boolean,

  user_agent                  text,
  referer                     text,
  request_path                text,

  details                     jsonb not null default '{}'::jsonb
);

create index apply_flow_events_created_at_idx
  on public.apply_flow_events (created_at desc);

create index apply_flow_events_trace_id_idx
  on public.apply_flow_events (trace_id, created_at);

create index apply_flow_events_singpass_raw_key_idx
  on public.apply_flow_events (singpass_raw_key)
  where singpass_raw_key is not null;

create index apply_flow_events_apply_trace_id_idx
  on public.apply_flow_events (apply_trace_id)
  where apply_trace_id is not null;

create index apply_flow_events_mobile_last4_idx
  on public.apply_flow_events (mobile_last4, created_at desc)
  where mobile_last4 is not null;

create index apply_flow_events_nric_last4_idx
  on public.apply_flow_events (nric_last4, created_at desc)
  where nric_last4 is not null;

alter table public.apply_flow_events enable row level security;

-- No INSERT/SELECT policies for anon or authenticated users.
-- Route handlers use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
