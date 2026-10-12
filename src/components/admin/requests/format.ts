export function monthLabel(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function dayLabel(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function relativeDay(iso?: string | null): string {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${Math.round(days / 365)} yr ago`;
}

/** First day of the month as `YYYY-MM-01`, offset by whole months. */
export function monthStart(offsetMonths = 0, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + offsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
