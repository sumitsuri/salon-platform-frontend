import { api, Customer } from "@/lib/api";

export type WalkInCustomerNameMatch = Customer | null | "ambiguous";

export type WalkInNameMatchScope = {
  branchId: string;
  branchSocietyDefault?: string | null;
};

function normalizeSociety(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

async function hasBookingAtBranch(customerId: string, branchId: string) {
  const page = await api.getBookings({ customerId, branchId, page: 0, size: 1 });
  return page.totalElements > 0;
}

function filterByBranchSociety(candidates: Customer[], branchSocietyDefault?: string | null) {
  const societyNorm = normalizeSociety(branchSocietyDefault);
  if (!societyNorm) return [];
  return candidates.filter((c) => normalizeSociety(c.society) === societyNorm);
}

/** Reuse an existing profile when the name matches — avoids duplicate guests on walk-in. */
export async function matchCustomerByExactName(
  name: string,
  scope?: WalkInNameMatchScope
): Promise<WalkInCustomerNameMatch> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const page = await api.listCustomers({ name: trimmed, page: 0, size: 25 });
  const exact = page.content.filter(
    (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
  );

  if (exact.length === 0) return null;

  if (scope?.branchId) {
    const branchHistoryMatches: Customer[] = [];
    for (const candidate of exact) {
      if (await hasBookingAtBranch(candidate.id, scope.branchId)) {
        branchHistoryMatches.push(candidate);
      }
    }
    if (branchHistoryMatches.length === 1) return branchHistoryMatches[0];
    if (branchHistoryMatches.length > 1) return "ambiguous";

    const societyMatches = filterByBranchSociety(exact, scope.branchSocietyDefault);
    if (societyMatches.length === 1) return societyMatches[0];
    if (societyMatches.length > 1) return "ambiguous";

    // Do not link a name-only guest to a profile from another society/branch.
    return null;
  }

  if (exact.length === 1) return exact[0];

  const withVisits = exact.filter((c) => (c.visitCount ?? 0) > 0);
  if (withVisits.length === 1) return withVisits[0];

  return "ambiguous";
}
