-- Drop the anon UPDATE policy on appointments.
--
-- 20260512000005 added `anon can update appointments by lead` with
-- `using (true) with check (true)`, which let any request bearing the
-- publishable key PATCH any appointment row — status, date, time,
-- airconnect_appointment_id, axs_notified_*.
--
-- The policy was speculative: its comment said it was for a browser-side
-- cancel/reschedule flow that never got built. Cancellation and status
-- changes run server-side through AirConnect webhook events to
-- /api/airconnect/appointment-event, which uses the service-role client
-- (admin.from(...)) and bypasses RLS entirely.
--
-- No app code calls `.from("appointments").update(...)` with the anon key.
-- Dropping the policy closes the write primitive without affecting any
-- legitimate flow. INSERT for anon stays (needed for the booking flow).

drop policy if exists "anon can update appointments by lead" on public.appointments;
