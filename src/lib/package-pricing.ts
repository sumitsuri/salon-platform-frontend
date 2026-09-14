/** Compute bundle list value from branch catalog prices × session qty. */
export function packageListTotal(
  items: { serviceId: string; quantity: number }[],
  priceByServiceId: Map<string, number>
): number {
  return items.reduce((sum, row) => {
    const unit = priceByServiceId.get(row.serviceId) ?? 0;
    return sum + unit * row.quantity;
  }, 0);
}

export function priceFromDiscountPercent(listTotal: number, discountPercent: number): number {
  if (listTotal <= 0) return 0;
  const pct = Math.min(100, Math.max(0, discountPercent));
  return Math.round(listTotal * (1 - pct / 100) * 100) / 100;
}

export function discountPercentFromPrice(listTotal: number, packagePrice: number): number {
  if (listTotal <= 0 || packagePrice <= 0) return 0;
  const pct = (1 - packagePrice / listTotal) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)) * 10) / 10;
}
