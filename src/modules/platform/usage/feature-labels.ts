const LABELS: Record<string, string> = {
  "admin.home": "Admin · Overview",
  "admin.bookings": "Admin · Bookings",
  "admin.finance": "Admin · Finance",
  "admin.local_spotlight": "Admin · Local Spotlight",
  "admin.market_pulse": "Admin · Market Pulse",
  "manager.home": "Manager · Home",
  "manager.walk_in": "Manager · Walk-in",
  "manager.face_scan": "Manager · Face scan",
  "manager.scalp_scan": "Manager · Scalp scan",
  "employee.home": "Employee · Home",
  "employee.time": "Employee · Time & attendance",
  "employee.sales": "Employee · Sales",
  "auth.login": "Sign-in",
};

export function featureLabel(key: string): string {
  if (LABELS[key]) return LABELS[key];
  return key.replace(/\./g, " · ").replace(/_/g, " ");
}
