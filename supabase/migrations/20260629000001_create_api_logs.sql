-- External API call logs — stores every outbound HTTP request for debugging.
-- Written by Route Handlers via service_role only (no anon policies).

create table public.api_logs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  tag             text not null,              -- e.g. "[apply/book]"
  method          text not null,              -- HTTP method
  url             text not null,              -- full URL including query params
  request_headers jsonb not null default '{}',
  request_body    jsonb,                      -- JSON body sent
  response_status integer,                    -- HTTP status code
  response_ok     boolean,
  response_body   text,                       -- response text (truncated)
  duration_ms     integer,                    -- round-trip time
  lead_id         uuid,                       -- optional FK for easy filtering
  error           text                        -- if the fetch threw an exception
);

-- Index for quick lookups by lead or time
create index idx_api_logs_lead_id on public.api_logs (lead_id);
create index idx_api_logs_created_at on public.api_logs (created_at desc);
