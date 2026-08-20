"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { bookApi, bookPath, type BookBranchSummary } from "@/lib/book-api";
import { PageLoader } from "@/components/ui";

export function BookTenantPicker({ tenantSlug }: { tenantSlug: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [branches, setBranches] = useState<BookBranchSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await bookApi.listBranches(tenantSlug);
        if (cancelled) return;
        setTenantName(data.tenantName);
        setBranches(data.branches);
        if (data.branches.length === 1) {
          window.location.href = bookPath(tenantSlug, data.branches[0].code);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Salon not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="book-app-shell flex min-h-dvh items-center justify-center">
        <PageLoader label="Loading…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="book-app-shell p-6 md:p-8">
        <p className="mx-auto max-w-md rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="book-app-shell flex min-h-dvh flex-col">
      <header className="border-b border-black/[0.06] book-content-pad py-6 md:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e8e93]">Book online</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1c1917] md:text-3xl">{tenantName}</h1>
        <p className="mt-1 text-sm text-[#636366] md:text-base">Choose a location to continue</p>
      </header>

      <ul className="book-content-pad grid grid-cols-1 gap-3 py-4 md:grid-cols-2 md:gap-4 md:py-6 lg:grid-cols-2 xl:grid-cols-3">
        {branches.map((b) => (
          <li key={b.id}>
            <Link
              href={bookPath(tenantSlug, b.code)}
              className="flex h-full items-center gap-3 rounded-2xl border border-[#f2f2f7] bg-white p-4 shadow-sm transition hover:border-[#e5e5ea] hover:shadow-md touch-manipulation active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f2f2f7] text-lg font-bold text-[#636366] md:h-14 md:w-14">
                {b.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1c1917] md:text-lg">{b.name}</p>
                {b.address ? (
                  <p className="mt-1 flex items-start gap-1 text-sm text-[#8e8e93]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="line-clamp-2">{b.address}</span>
                  </p>
                ) : null}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#c7c7cc]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
