/** Normalize and validate Indian mobile numbers for front-desk entry. */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Accepts 10-digit mobile, or +91 / 91 prefixed forms. Returns 10-digit local form. */
export function normalizeIndianMobile(value: string): string | null {
  let d = digitsOnly(value);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10) return null;
  if (!/^[6-9]/.test(d)) return null;
  return d;
}

export function isValidIndianMobile(value: string): boolean {
  return normalizeIndianMobile(value) != null;
}
