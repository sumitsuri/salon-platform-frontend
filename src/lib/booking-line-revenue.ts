import type { Booking, BookingLine } from "@/lib/api";

function grossLineAmount(line: BookingLine): number {
  const qty = Math.max(1, line.quantity ?? 1);
  return line.unitPrice * qty;
}

/** Final line total after discounts & GST (from bill preview), keyed by line id. */
export function finalAmountByLineId(booking: Booking): Map<string, number> {
  const lines = booking.lines ?? [];
  const previewLines = booking.billPreview?.lines ?? [];
  const map = new Map<string, number>();

  if (previewLines.length > 0) {
    for (const preview of previewLines) {
      if (preview.lineItemId != null && preview.lineTotal != null) {
        map.set(preview.lineItemId, preview.lineTotal);
      }
    }
    if (map.size > 0) {
      return map;
    }
  }

  const grossTotal = lines.reduce((sum, line) => sum + grossLineAmount(line), 0);
  const target = booking.billPreview?.grandTotal ?? grossTotal;
  if (grossTotal <= 0) {
    return map;
  }

  for (const line of lines) {
    const gross = grossLineAmount(line);
    map.set(line.id, (gross / grossTotal) * target);
  }
  return map;
}

export function lineListAmount(line: BookingLine): number {
  return grossLineAmount(line);
}

export function lineFinalAmount(booking: Booking, line: BookingLine): number {
  return finalAmountByLineId(booking).get(line.id) ?? grossLineAmount(line);
}
