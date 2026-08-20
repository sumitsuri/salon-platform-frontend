"use client";

import { usePathname } from "next/navigation";
import { BookTenantPicker } from "@/components/book/BookTenantPicker";
import { OnlineBookFlow } from "@/components/book/OnlineBookFlow";
import { parseBookPathname } from "@/lib/book-routes";

function resolveBookPathname(routerPathname: string): string {
  if (typeof window === "undefined") return routerPathname;
  const browserPath = window.location.pathname;
  if (parseBookPathname(browserPath)) return browserPath;
  return routerPathname;
}

/** Client router for /book/* — used by the static-export shell on prod (any branch URL). */
export function BookDynamicEntry() {
  const routerPathname = usePathname();
  const pathname = resolveBookPathname(routerPathname);
  const parsed = parseBookPathname(pathname);

  if (!parsed) {
    return (
      <div className="book-app-shell flex min-h-dvh items-center justify-center p-6">
        <p className="text-center text-sm text-[#636366]">Open a salon booking link from your stylist or brand page.</p>
      </div>
    );
  }

  if (parsed.branchCode) {
    return <OnlineBookFlow tenantSlug={parsed.tenantSlug} branchCode={parsed.branchCode} />;
  }

  return <BookTenantPicker tenantSlug={parsed.tenantSlug} />;
}
