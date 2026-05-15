/**
 * GET /api/apply/calendar?date=YYYY-MM-DD&time=HH:MM
 *
 * Returns an .ics file with Content-Disposition: inline so that:
 * - iOS Safari immediately shows "Add to Calendar" without a share sheet
 * - Android Chrome downloads and hands off to the system calendar handler
 */

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") ?? "";
  const timeStr = searchParams.get("time") ?? "";

  if (!dateStr || !timeStr) {
    return new Response("Missing date or time", { status: 400 });
  }

  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);

  if ([y, mo, d, h, mi].some(Number.isNaN)) {
    return new Response("Invalid date or time", { status: 400 });
  }

  const start = new Date(y, mo - 1, d, h, mi, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1-hour slot

  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}` +
    `T${String(dt.getHours()).padStart(2, "0")}${String(dt.getMinutes()).padStart(2, "0")}00`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CF Money//Appointment//EN",
    "BEGIN:VEVENT",
    `UID:cfmoney-appt-${start.getTime()}@cfmoney.sg`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART;TZID=Asia/Singapore:${fmt(start)}`,
    `DTEND;TZID=Asia/Singapore:${fmt(end)}`,
    "SUMMARY:CF Money Loan Appointment",
    "LOCATION:1 North Bridge Road\\, #01-35 High Street Centre\\, Singapore 179094",
    "DESCRIPTION:Please bring your NRIC/FIN and income documents. Please arrive on time to ensure a smoother process.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // "inline" (not "attachment") triggers iOS Safari's native Add-to-Calendar dialog
      "Content-Disposition": 'inline; filename="cf-money-appointment.ics"',
    },
  });
}
