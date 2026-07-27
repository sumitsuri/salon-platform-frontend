/** Predefined product use cases — mirrors backend SalesUseCases.PREDEFINED */
export const PREDEFINED_USE_CASES = [
  "P&L tracking",
  "WhatsApp campaigns",
  "Inventory management",
  "Staff scheduling",
  "Customer CRM",
  "Online bookings",
  "Multi-branch reporting",
  "Payment reconciliation",
  "Marketing automation",
  "Loyalty programs",
] as const;

export function parseUseCases(value?: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatUseCases(selected: string[]): string {
  return selected.filter(Boolean).join(", ");
}

export function mergeNotesWithCustomUseCases(
  notes: string,
  customUseCases: string
): string {
  const trimmed = customUseCases.trim();
  if (!trimmed) return notes;
  const prefix = "Additional use cases:";
  if (notes.includes(prefix)) {
    return notes.replace(/Additional use cases:.*?(?=\n|$)/, `${prefix} ${trimmed}`);
  }
  return notes ? `${notes}\n${prefix} ${trimmed}` : `${prefix} ${trimmed}`;
}

export function extractCustomUseCasesFromNotes(notes?: string | null): string {
  if (!notes) return "";
  const match = notes.match(/Additional use cases:\s*(.+)/);
  return match?.[1]?.trim() ?? "";
}

export function stripCustomUseCasesFromNotes(notes?: string | null): string {
  if (!notes) return "";
  return notes.replace(/\n?Additional use cases:.*$/s, "").trim();
}
