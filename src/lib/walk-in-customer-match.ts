import { api, Customer } from "@/lib/api";

export type WalkInCustomerNameMatch = Customer | null | "ambiguous";

/** Reuse an existing profile when the name matches — avoids duplicate guests on walk-in. */
export async function matchCustomerByExactName(name: string): Promise<WalkInCustomerNameMatch> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const page = await api.listCustomers({ name: trimmed, page: 0, size: 25 });
  const exact = page.content.filter(
    (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
  );

  if (exact.length === 0) return null;
  if (exact.length === 1) return exact[0];

  const withVisits = exact.filter((c) => (c.visitCount ?? 0) > 0);
  if (withVisits.length === 1) return withVisits[0];

  return "ambiguous";
}
