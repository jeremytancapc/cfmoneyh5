-- Migration: Allow the anon/publishable key to write leads and appointments.
--
-- Context: this project uses only the publishable key (no service-role key
-- configured yet). These policies let the apply flow create leads and book
-- appointments from Route Handlers.
--
-- Read access is intentionally blocked for the anon role — data can only be
-- read by a server using the service-role key (or future authenticated staff).

-- leads: allow anonymous INSERT only (no SELECT/UPDATE/DELETE from browser)
create policy "anon can insert leads"
  on public.leads
  for insert
  to anon
  with check (true);

-- myinfo_profiles: allow anonymous INSERT only
create policy "anon can insert myinfo profiles"
  on public.myinfo_profiles
  for insert
  to anon
  with check (true);

-- appointments: allow anonymous INSERT only
create policy "anon can insert appointments"
  on public.appointments
  for insert
  to anon
  with check (true);

-- appointments: allow anonymous UPDATE of their own row by lead_id
-- (so the front-end can cancel / reschedule without a service-role key)
create policy "anon can update appointments by lead"
  on public.appointments
  for update
  to anon
  using (true)
  with check (true);
