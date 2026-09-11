import { api, Customer } from "@/lib/api";

export type WalkInCustomerNameMatch = Customer | null | "ambiguous";

export type WalkInNameMatchScope = {
  branchId: string;
  branchSocietyDefault?: string | null;
};

/** Reuse an existing profile when the name matches at this branch — avoids duplicate guests on walk-in. */
export async function matchCustomerByExactName(
  name: string,
  scope: WalkInNameMatchScope
): Promise<WalkInCustomerNameMatch> {
  const trimmed = name.trim();
  if (!trimmed || !scope.branchId) return null;

  const page = await api.listCustomers({
    name: trimmed,
    branchId: scope.branchId,
    page: 0,
    size: 25,
  });
  const exact = page.content.filter(
    (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
  );

  if (exact.length === 0) return null;
  if (exact.length === 1) return exact[0];
  return "ambiguous";
}
