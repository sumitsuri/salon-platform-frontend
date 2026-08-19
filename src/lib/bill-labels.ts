/** Normalizes bill adjustment labels from API (fixes legacy " ? " separators). */
export function cleanBillLabel(label: string | undefined | null): string | undefined {
  if (!label) return undefined;
  return label
    .replace(/ \? /g, " · ")
    .replace(/\(\?(\d)/g, "($1")
    .replace(/^Offer \? /, "Offer · ")
    .replace(/^Membership \? /, "Membership · ")
    .replace(/^Coupon (\S+) \? /, "Coupon $1 · ");
}
