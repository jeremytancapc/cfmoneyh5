import type { Metadata } from "next";

import { RejectedView } from "./rejected-view";

export const metadata: Metadata = {
  title: "Application Update — CF Money",
};

/**
 * Where AXS send a hard-rejected applicant (existing borrower, blacklisted or
 * under 18): the bookingUrl from /api/axs/submit points here instead of the
 * booking link. Deliberately the same page for all three, with no lead id in
 * the URL, so it never tells anyone holding the link why they were turned away.
 */
export default function AxsRejectedPage() {
  return <RejectedView />;
}
