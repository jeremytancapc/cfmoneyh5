/** Append leadId for approval/pending when the session cookie may not persist (large Singpass sessions). */
export function postSubmitUrl(path: string, leadId: string | null | undefined): string {
  if (!leadId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}leadId=${encodeURIComponent(leadId)}`;
}
