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

/** Optional phone: partial digits are ignored; only a full invalid 10-digit entry blocks. */
export function optionalPhoneBlocksContinue(raw: string, phoneValid: boolean): boolean {
  const digits = digitsOnly(raw);
  if (digits.length === 0 || phoneValid) return false;
  return digits.length >= 10;
}

export function shouldShowInvalidPhoneHint(
  raw: string,
  phoneValid: boolean,
  phoneRequired: boolean,
): boolean {
  if (digitsOnly(raw).length === 0 || phoneValid) return false;
  return phoneRequired || digitsOnly(raw).length >= 10;
}
