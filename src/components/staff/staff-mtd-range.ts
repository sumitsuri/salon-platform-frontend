export function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Month-to-date through today — matches staff sales default range. */
export function staffPortalMtdRange(): { from: string; to: string } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  return { from: isoLocal(fromDate), to: isoLocal(today) };
}
