/** Loose UUID check for lead IDs from query strings (defensive only). */
export function looksLikeLeadUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

/**
 * Last 8 hex characters of a lead UUID, uppercased — the shared suffix behind
 * every customer-facing application ref. Only the prefix differs per channel,
 * so the same lead is recognisable across them.
 */
export function refSuffix(leadId: string): string {
  return leadId.replace(/-/g, "").slice(-8).toUpperCase();
}

/** Customer-facing ref for the H5 and AIP flows, e.g. CFH5-451FD317. */
export function cfh5ApplicationRef(leadId: string): string {
  return `CFH5-${refSuffix(leadId)}`;
}

/** Customer-facing ref for AXS partner applications, e.g. CFAXS-451FD317. */
export function axsApplicationRef(leadId: string): string {
  return `CFAXS-${refSuffix(leadId)}`;
}
