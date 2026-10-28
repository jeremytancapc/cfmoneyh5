# AXS appointment status sync — staging test cases

What to test on staging before turning the sync on in UAT and production. The
design is in `axs-appointment-status-sync-plan.md`.

Use test applicants only (test phone numbers, test NRIC/FIN). Never use a real
customer's details.

## Before you start

| Check | Where |
|---|---|
| H5 migration `20261028000001_axs_status_sync.sql` applied | H5 staging Supabase |
| AirConnect migration `0015_h5_links.sql` applied | neon-dev (already done) |
| `AIRCONNECT_AXS_APPOINTMENTS_URL` = `<AirConnect stg>/api/appointments/axs` | H5 staging env |
| `AIRCONNECT_REAPPLY_NOTE_URL` = `<AirConnect stg>/api/borrowers/reapply-note` | H5 staging env |
| `H5_EVENT_WEBHOOK_KEY` set, **same value on both sides** | H5 + AirConnect staging env |
| `H5_APPOINTMENT_EVENT_URL` = `<H5 stg>/api/airconnect/appointment-event` | AirConnect staging env |
| `AXS_BOOKING_WEBHOOK_URL` / `_API_KEY` point at AXS UAT (or a request bin) | H5 staging env |
| `AXS_STATUS_SYNC_ENABLED=true` (except for test 18) | H5 staging env |

Redeploy both apps after changing env vars.

## Where to look

**H5 (Supabase staging)**: the lead's appointment rows, plus the outgoing calls.
Replace `<lead uuid>` with the test lead's `leads.id`.

```sql
select id, status, appointment_date, appointment_time,
       airconnect_appointment_id, axs_notified_status, axs_notified_at, created_at
from appointments where lead_id = '<lead uuid>' order by created_at;

select created_at, tag, response_status, response_ok, request_body
from api_logs where lead_id = '<lead uuid>' order by created_at;
```

The `api_logs` tags you'll see:
- `[axs/book]`: booking sent to AirConnect.
- `[axs/book:webhook]`: "booked" sent to AXS.
- `[airconnect/appointment-event:<event>]`: a status sent to AXS after an
  AirConnect change.
- `[airconnect/reapply-note]`: reloan note sent to AirConnect.

The event endpoint also logs its decision to the H5 server log (Vercel), under
`[airconnect/appointment-event] decision`.

**AirConnect (neon-dev)**: the link, the lead's source, and what was pushed.

```sql
select * from t3gallery_h5_links where h5_lead_id = '<lead uuid>';

select l.id, l.source, l.status from t3gallery_leads l
join t3gallery_h5_links k on k.lead_id = l.id where k.h5_lead_id = '<lead uuid>';

select timestamp, entity_id as appointment_id, action, description
from t3gallery_logs where entity_type in ('h5_appointment_push', 'h5_link')
order by timestamp desc limit 20;
```

Push actions are `sent`, `failed` or `skipped`. Each description says why.

**AXS**: what their UAT webhook received (or your request bin). Check `status`,
`booking_date`, `booking_time` and `booking_url`.

**Booking link**: open the customer's `bookingUrl` from the submit response.
- **Closed:** it redirects to `/axs/booked`, the confirmation page.
- **Open:** it shows the date/time picker.

## How to make a test AXS booking

1. **Submit an application** as AXS would, using test data:

   ```bash
   curl -s -X POST "<H5 stg>/api/axs/submit" \
     -H "x-api-key: <AXS_PARTNER_API_KEY>" -H "Content-Type: application/json" \
     -d '{"myinfo":{"uinfin":{"value":"<test NRIC>"},"name":{"value":"TEST AXS ONE"},
          "dob":{"value":"1990-01-01"},"nationality":{"code":"SG"},
          "mobileno":{"prefix":{"value":"+"},"areacode":{"value":"65"},"nbr":{"value":"<test 8-digit>"}},
          "axs":{"reference-id":"AXSTEST0001","loan_amount":5000,"tenure":12}}}'
   ```

   The response gives `status`, `leadId` (`CFAXS-…`) and `bookingUrl`. Find the
   lead's uuid with
   `select id from leads where axs_ref = 'AXSTEST0001' order by created_at desc limit 1;`.
2. **Book a slot:** open `bookingUrl` and pick one.

Use a new `reference-id` and test phone for each fresh run. Otherwise
AirConnect sees the earlier test lead.

---

## A. Booking

| # | Do | Expect |
|---|---|---|
| 1 | **New customer books.** Test phone not in AirConnect, then book a slot. | **H5:** one `confirmed` row, `axs_notified_status = booked`. **AXS:** `booked` with the slot. **AirConnect:** new lead with `source = AXS`, `ascend_status = submitted_from_h5`; `h5_links` row with `lead_id` set; `h5_link_saved` log. |
| 2 | **Customer already a lead in AirConnect** (phone exists as a non-borrower lead). Submit and book. | Same as 1, except the **existing** lead keeps its original source and the link points to that lead. |
| 3 | **Double-tap:** book, then submit the same slot again. | Same booking returned. No second row, and no second webhook to AXS or AirConnect. |
| 4 | **Second slot on the same link** (after booking, try a different slot from another tab). | 409 "already has an appointment". Nothing new sent. |
| 5 | **AirConnect AXS endpoint without `leadId`**: POST `/api/appointments/axs` with no `leadId`. | 400. No lead created. |

## B. Agent creates the AirConnect appointment

| # | Do | Expect |
|---|---|---|
| 6 | **Agent books the same date/time** the customer picked. | **AirConnect:** push `sent` (created). **H5:** row gets `airconnect_appointment_id`, slot unchanged. **AXS:** nothing new (already `booked`). |
| 7 | **Agent books a different date/time.** | **AXS:** `booked` with the agent's date/time. **H5:** row slot changes to it. Link stays closed. |

## C. Reschedule

| # | Do | Expect |
|---|---|---|
| 8 | **Agent reschedules** in the dashboard. | **AXS:** `rescheduled` with the new date/time. **H5:** row slot and `airconnect_appointment_id` (the new AirConnect appointment) update, `axs_notified_status = rescheduled`. Link stays closed and shows the new slot. |

## D. Cancel

| # | Do | Expect |
|---|---|---|
| 9 | **Agent cancels** the appointment. | **AXS:** `cancelled` with `booking_url` and the last slot. **H5:** row `cancelled`, `cancelled_at` set. **Link: open** (picker shows). |
| 10 | **Customer rebooks** from the same link after 9. | **H5:** a **new** `confirmed` row. **AXS:** `booked` with the new slot. **AirConnect:** `h5_links.booked_at` moves to now. Link closed again. |
| 11 | **After 10**, the agent cancels the **old** AirConnect appointment again (or any appointment from before the rebook). | Nothing. AirConnect logs no push, because the appointment is older than `booked_at`. |

## E. Missed

| # | Do | Expect |
|---|---|---|
| 12 | **Agent marks Missed** in the dashboard or on the retail page. | **AXS:** `missed` with `booking_url`. **H5:** row `missed`. **Link: open.** |
| 13 | **Branch sheet** marks a no-show (2h+ past the slot, UW empty). | Same as 12. |

## F. Done

| # | Do | Expect |
|---|---|---|
| 14 | **Agent marks Done.** | **AXS:** nothing. **H5:** row `completed`. **Link: closed** (confirmation page). |
| 15 | **Late arrival:** marked missed (13), then the branch sheet fills UW. | **H5:** row `missed` → `completed`. **Link: closed again.** AXS gets only the earlier `missed`, no `completed`. |
| 16 | **Walk-in with no AirConnect appointment:** the customer turns up and the branch sheet creates and completes one. | **AXS:** no `booked`. **H5:** row `completed`. Link closed. |
| 17 | **After 14**, the agent creates another appointment for the same lead. | Nothing reaches AXS. The H5 row stays `completed` and the link stays closed. |

## G. Undo

| # | Do | Expect |
|---|---|---|
| 18 | **Mark missed by mistake, then set it back to Upcoming.** | **First:** AXS `missed` and the link opens. **Then:** AXS `booked` again, a new `confirmed` H5 row, and the link closes. |
| 19 | **Re-save the same status** (e.g. Missed on an already-missed appointment). | Nothing sent. |

## H. Safety switches

| # | Do | Expect |
|---|---|---|
| 20 | **Kill switch off:** unset `AXS_STATUS_SYNC_ENABLED`, redeploy H5, then cancel in AirConnect. | **AirConnect:** push `sent`. **H5:** response `"sync disabled"`, no row change, nothing to AXS. |
| 21 | **Wrong key:** POST `/api/airconnect/appointment-event` with a wrong `x-api-key`. | 401. |
| 22 | **AirConnect env missing:** unset `H5_APPOINTMENT_EVENT_URL`, then cancel. | The agent's cancel still works. Push logged `skipped`. |
| 23 | **H5 down / wrong URL:** point `H5_APPOINTMENT_EVENT_URL` somewhere wrong, then cancel. | The agent's cancel still works, with no delay. Push logged `failed`. **Accepted:** not retried. |

## I. Reloan rejection

| # | Do | Expect |
|---|---|---|
| 24 | **Submit an applicant who is already a borrower** in AirConnect (test borrower phone). | **AXS:** `status = rejected`, notes "Existing customer. Please contact us directly.", and `bookingUrl` = `<H5 base>/axs/rejected`, the rejected page, **not** the booking link. **AirConnect:** the borrower gets the note "Reapplied via AXS – … please contact them for a reloan". **H5 `api_logs`:** `[airconnect/reapply-note]` with the phone and NRIC masked (`****xxxx`). |
| 24b | **Open that link** in a fresh browser (no H5 session). | The rejected page loads: "We can't proceed with this application", with a WhatsApp contact. It shows no name and no reason. There is no date/time picker and no way to book. |
| 25 | **Blacklisted test applicant**, and separately an **under-18**. | `status = rejected`, and `bookingUrl` = `/axs/rejected`, never `/axs/book`. **No** borrower note for either. |

## L. Which page the AXS link opens

Several test profiles are the same type of customer. The page the customer
lands on from `bookingUrl` follows one rule:

| Customer | Page |
|---|---|
| SG/PR **with** CPF or NOA detected | **Book appointment** (`/axs/book`, picker shows) |
| SG/PR with **no** CPF/NOA detected | **Pending** |
| **Any foreigner**, whatever their income (docs are checked manually and the customer advised before booking) | **Pending** |
| Under 18 | **Rejected** (`/axs/rejected`) |
| Reloan (already a borrower) | **Rejected** |
| Blacklisted | **Rejected** |

One test per row type is enough. Testing a second profile of the same type adds
nothing.

| # | Do | Expect |
|---|---|---|
| 30 | **SG with CPF** contributions in MyInfo. | `status = pending`. `bookingUrl` opens the booking page with the picker. |
| 31 | **SG with NOA only**, no CPF. | Same as 30. |
| 32 | **PR with CPF** (`nationality` not SG, `residentialstatus` = PR). | Same as 30. A PR must not be treated as a foreigner. |
| 33 | **SG/PR with no CPF and no NOA.** | `status = pending`. `bookingUrl` = `/apply/pending?leadId=…`, the **pending** page. No picker, no way to book. |
| 34 | **Foreigner with income** (CPF or NOA present). | Pending page, as 33. If approved, notes say the team will review and contact the customer, **not** "proceed to book". |
| 35 | **Foreigner with no income** data. | Pending page, as 33. |
| 36 | **Under 18.** | `status = rejected`. `bookingUrl` = `/axs/rejected`. |
| 37 | **Reloan** (test borrower phone). | `status = rejected`. `bookingUrl` = `/axs/rejected`. The borrower note from 24 is still added. |
| 38 | **Blacklisted.** | Same as 36. |

For 32, check H5 `leads.id_type = pr` for the lead.

**Not covered:** a pending-page customer whom an agent later books in
AirConnect isn't synced to AXS. They never booked through the H5, so there's
no `h5_links` row for AirConnect to push against.

## J. Nothing else changed

| # | Do | Expect |
|---|---|---|
| 26 | **Normal H5 booking** (not AXS) through `/apply`. | Books exactly as before, via `/api/appointments/cfh5`. No `h5_links` row, and no push when its appointment changes. |
| 27 | **Cancel / reschedule / done on any non-AXS appointment.** | Works as before. No `h5_appointment_push` log rows for it. |

## K. Personal data

| # | Check | Expect |
|---|---|---|
| 28 | **Every AXS webhook body** (api_logs `request_body` on the webhook tags). | Only `reference_id`, `booking_date`, `booking_time`, `booking_url`, `status`, `metadata.booking_id`, `loan_reference_no`. **No name, phone or NRIC.** |
| 29 | **AirConnect server log and `t3gallery_appointment_reminder_log`** for an AXS booking. | NRIC shows as `****xxxx`. |

---

## Known gaps (accepted, don't log as bugs)

- **Respond.io bot cancels** don't reach AXS.
- **Borrower (reloan) appointments** aren't pushed.
- **Failed pushes or webhooks** are logged once and never retried.
- **Two "booked" webhooks:** if an agent creates the appointment within seconds
  of the customer booking, AXS can receive "booked" twice.
- **No AirConnect appointment ever created:** AXS keeps showing `booked`.
- **Rebook after a cancel:** it lands on the existing AirConnect lead, which can
  stay `missed/RS` in the agent's list.
