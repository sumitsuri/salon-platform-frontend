export const PLATFORM_ROLES = new Set(["PLATFORM_SUPER_ADMIN", "SALES_EXECUTIVE"]);

export function isPlatformRole(role: string | undefined | null): boolean {
  return role != null && PLATFORM_ROLES.has(role);
}
