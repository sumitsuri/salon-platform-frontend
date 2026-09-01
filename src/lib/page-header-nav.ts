import type { BreadcrumbItem } from "@/components/Breadcrumbs";

function normalizeLabel(label: string) {
  return label.trim().toLowerCase();
}

/** Breadcrumbs show where you came from; the page H1 is the current destination. */
export function resolvePageHeaderNav(
  breadcrumbs: BreadcrumbItem[],
  title: string
): { ancestors: BreadcrumbItem[] } {
  if (breadcrumbs.length === 0) return { ancestors: [] };

  const last = breadcrumbs[breadcrumbs.length - 1];
  const titleMatches = normalizeLabel(last.label) === normalizeLabel(title);
  const lastIsCurrent = !last.href && !last.onClick;

  if (titleMatches || lastIsCurrent) {
    return { ancestors: breadcrumbs.slice(0, -1) };
  }

  return { ancestors: breadcrumbs };
}

/** Mobile shell has no page title — drop leaf crumb when it is a non-link current marker. */
export function resolveMobileBreadcrumbs(breadcrumbs: BreadcrumbItem[]): BreadcrumbItem[] {
  if (breadcrumbs.length === 0) return breadcrumbs;
  const last = breadcrumbs[breadcrumbs.length - 1];
  if (!last.href && !last.onClick) {
    return breadcrumbs.slice(0, -1);
  }
  return breadcrumbs;
}
