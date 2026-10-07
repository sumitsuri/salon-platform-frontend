/** Canonical staff designations for login provisioning and profile. */
export const STAFF_DESIGNATION_OPTIONS = [
  "Unisex Hairdresser",
  "Female Hairdresser",
  "Male Hairdresser",
  "Beautician",
  "Manager",
  "OpsAdmin",
] as const;

export type StaffDesignation = (typeof STAFF_DESIGNATION_OPTIONS)[number];

export function isStaffDesignation(value: string): value is StaffDesignation {
  return (STAFF_DESIGNATION_OPTIONS as readonly string[]).includes(value);
}

export function resolveStaffDesignation(existing?: string | null): StaffDesignation | "" {
  if (!existing) return "";
  if (isStaffDesignation(existing)) return existing;
  return "";
}
