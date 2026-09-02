import { Booking } from "@/lib/api";
import { formatTenantDateTime, TenantLocaleKit } from "@/lib/tenant-locale";

export function bookingVisitAt(booking: Booking): string | undefined {
  return booking.completedAt ?? booking.createdAt;
}

export function formatBookingVisitAt(
  booking: Booking,
  kit: TenantLocaleKit,
  options?: Intl.DateTimeFormatOptions
): string {
  const at = bookingVisitAt(booking);
  return at ? formatTenantDateTime(at, kit, options) : "—";
}

export function formatCustomerLastVisit(
  lastVisitAt: string | undefined,
  kit: TenantLocaleKit
): string {
  return lastVisitAt
    ? formatTenantDateTime(lastVisitAt, kit, { day: "numeric", month: "short", year: "numeric" })
    : "—";
}
