# AXS worklist sheet (Google Sheets + Apps Script)

A sheet that lists every AXS application, including the ones that never booked,
with where each one stands. It is keyed by our application reference and holds
**no personal data**: no name, email, phone, NRIC, income or loan amount. Anyone
who needs the customer's details looks the reference up in AirConnect.

Why: the sheet lives in Google, outside our own systems, and company policy
(PDPA) does not allow customer personal data to be copied there. Internal
references and statuses are enough to run the worklist.

## Columns

Row 1 is the header. The script writes **A–N** on every sync and never touches
**O–T**, which are for the team and the void button.

| Col | Header | Filled by | Meaning |
|---|---|---|---|
| A | Submitted (SGT) | sync | When AXS submitted the application |
| B | CFAXS ref | sync | **Key.** Our reference; the 8-character suffix finds the lead in AirConnect |
| C | AXS reference | sync | AXS's `reference_id`, used by the void button |
| D | Residency | sync | SG / PR / Foreigner |
| E | Income found | sync | CPF / NOA / None |
| F | Page | sync | Book / Pending / Rejected (the page the AXS link opened) |
| G | Rejected because | sync | Existing customer / Not eligible / Under 18 (blank otherwise) |
| H | Stage | sync | See below |
| I | Appointment (SGT) | sync | Latest booked date and time |
| J | Appointment status | sync | confirmed / completed / missed / cancelled |
| K | AirConnect appt # | sync | Set once an agent has created the AirConnect appointment |
| L | Last told AXS | sync | booked / rescheduled / cancelled / missed |
| M | AXS told at (SGT) | sync | When AXS was last told |
| N | Last synced | sync | When this row was last refreshed |
| O | Remarks | team | Free text |
| P | PIC | team | Who is handling it |
| Q | Void reason | team | Typed before pressing Void |
| R | Void result | script | HTTP status and AXS's reply |
| S | Voided at | script | When the void was sent |
| T | Voided by | script | Google account that sent it |

**Stage (H):**
- `Rejected`: the AXS link opened the rejected page.
- `Pending review`: the pending page (foreigner, or SG/PR with no CPF/NOA); our team must contact them.
- `Not booked yet`: given the booking link but hasn't picked a slot (the "half-way" customers).
- `Booked – waiting for agent`: picked a slot, no AirConnect appointment yet.
- `Booked – agent confirmed`: the agent created the AirConnect appointment.
- `Done` / `Missed` / `Cancelled`: what AirConnect last reported.

## 1. Database: a view with no personal data (once per environment)

Migration `supabase/migrations/20261029000001_axs_worklist_view.sql` creates
`reporting.axs_worklist` and a login role, `axs_worklist_reader`, that can read
that view and nothing else, so the password stored in Apps Script can never
reach customer details. The `reporting` schema is not exposed by Supabase's API.

After applying it, give the role a password by hand (never commit it):

```sql
alter role axs_worklist_reader with password '<from the password manager>';
```

`Page` is worked out again from saved fields, not stored at submit time:
"income found" uses the credit assessment's income source, which is CPF when
any CPF was found and NOA when only an NOA was. Check a few rows against the
submit responses before relying on it.

## 2. Apps Script

Extensions → Apps Script. Under Project Settings → Script Properties, add:

| Property | Value |
|---|---|
| `DB_URL` | `jdbc:postgresql://<pooler host>:5432/postgres?sslmode=require` |
| `DB_USER` | `axs_worklist_reader` (with the pooler's project suffix if it needs one) |
| `DB_PASSWORD` | that role's password |
| `AXS_VOID_URL` | the AXS void endpoint (UAT or production) |
| `AXS_VOID_API_KEY` | the AXS key, **never** in a cell or in the code |

```javascript
const SHEET_NAME = 'AXS worklist';
const HEADER_ROWS = 1;
const KEY_COL = 2;      // B: CFAXS ref
const SYNC_COLS = 14;   // A–N; O–T are never written by the sync
const COL = { AXS_REF: 3, VOID_REASON: 17, VOID_RESULT: 18, VOIDED_AT: 19, VOIDED_BY: 20 };
const DAYS_BACK = 30;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AXS')
    .addItem('Sync now', 'syncAxsWorklist')
    .addSeparator()
    .addItem('Void selected application…', 'voidSelectedApplication')
    .addToUi();
}

function props_(name) {
  const v = PropertiesService.getScriptProperties().getProperty(name);
  if (!v) throw new Error(`Script property ${name} is not set`);
  return v;
}

function sgtNow_() {
  return Utilities.formatDate(new Date(), 'Asia/Singapore', 'yyyy-MM-dd HH:mm');
}

/** Refreshes A–N for every AXS application from the last DAYS_BACK days or with an upcoming appointment. */
function syncAxsWorklist() {
  const sql = `
    select submitted_sgt, cfaxs_ref, axs_ref, residency, income_found, page,
           rejected_because, stage, appointment_sgt, appointment_status,
           airconnect_appt, last_told_axs, axs_told_at
    from reporting.axs_worklist
    where created_at > now() - interval '${DAYS_BACK} days'
       or appointment_date >= current_date
    order by created_at asc`;

  const conn = Jdbc.getConnection(props_('DB_URL'), props_('DB_USER'), props_('DB_PASSWORD'));
  const rs = conn.createStatement().executeQuery(sql);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found`);

  const lastRow = sheet.getLastRow();
  const rowOf = {};
  if (lastRow > HEADER_ROWS) {
    sheet.getRange(HEADER_ROWS + 1, KEY_COL, lastRow - HEADER_ROWS, 1).getValues()
      .forEach(([v], i) => { if (v) rowOf[String(v).trim()] = HEADER_ROWS + 1 + i; });
  }

  const synced = sgtNow_();
  const updates = [];
  const inserts = [];
  while (rs.next()) {
    const row = [];
    for (let c = 1; c <= 13; c++) row.push(rs.getString(c) || '');
    row.push(synced); // N: last synced
    const at = rowOf[row[KEY_COL - 1]];
    if (at) updates.push({ at, row }); else inserts.push(row);
  }
  rs.close();
  conn.close();

  updates.forEach(({ at, row }) => sheet.getRange(at, 1, 1, SYNC_COLS).setValues([row]));
  if (inserts.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, inserts.length, SYNC_COLS).setValues(inserts);
  }
  console.log(`AXS worklist: ${updates.length} updated, ${inserts.length} added`);
}

/**
 * Voids the AXS application on the selected row. Asks for confirmation, sends
 * one PATCH, and writes the result to R–T. Nothing is retried.
 */
function voidSelectedApplication() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return ui.alert(`Select a row on the "${SHEET_NAME}" sheet first.`);

  const row = sheet.getActiveRange().getRow();
  if (row <= HEADER_ROWS) return ui.alert('Select an application row.');

  const ref = String(sheet.getRange(row, COL.AXS_REF).getValue()).trim();
  const cfaxs = String(sheet.getRange(row, KEY_COL).getValue()).trim();
  const reason = String(sheet.getRange(row, COL.VOID_REASON).getValue()).trim();
  if (!ref) return ui.alert('This row has no AXS reference.');
  if (!reason) return ui.alert('Type the reason in "Void reason" (column Q) first.');
  if (sheet.getRange(row, COL.VOIDED_AT).getValue()) return ui.alert('This application was already voided.');

  const ok = ui.alert(
    'Void AXS application?',
    `${cfaxs} (AXS ${ref})\nReason: ${reason}\n\nThis tells AXS to void it and cannot be undone here.`,
    ui.ButtonSet.OK_CANCEL,
  );
  if (ok !== ui.Button.OK) return;

  const res = UrlFetchApp.fetch(props_('AXS_VOID_URL'), {
    method: 'patch',
    contentType: 'application/json',
    headers: { 'x-api-key': props_('AXS_VOID_API_KEY') },
    payload: JSON.stringify({ reference_id: ref, reason }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  const body = res.getContentText().slice(0, 200);

  sheet.getRange(row, COL.VOID_RESULT).setValue(`${code} ${body}`);
  if (code >= 200 && code < 300) {
    sheet.getRange(row, COL.VOIDED_AT, 1, 2).setValues([[sgtNow_(), Session.getActiveUser().getEmail()]]);
  }
  ui.alert(code >= 200 && code < 300 ? 'Voided.' : `AXS did not accept it (HTTP ${code}). See column R.`);
}
```

Add a time-driven trigger for `syncAxsWorklist` (for example every 15 minutes).

## Known gaps

- **A void only reaches AXS.** The H5 and AirConnect don't hear about it: an
  existing appointment stays open in AirConnect, and the sync keeps showing the
  H5's own stage. Column S is the record that it was voided.
- **Pending-review customers are not in AirConnect.** They never book, so no
  AirConnect lead exists, and this sheet deliberately doesn't carry their phone
  number. Contacting them needs a lead in AirConnect (an H5 change).
- **AirConnect lead ID and agent name aren't in the H5**, so they aren't in the
  sheet. Search AirConnect by the CFAXS suffix (column B).
