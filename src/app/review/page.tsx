"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { PublicReviewForm } from "@/components/reviews/PublicReviewForm";
import { PageLoader } from "@/components/ui";

function PublicReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState<Awaited<ReturnType<typeof api.getPublicReviewContext>> | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid review link.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getPublicReviewContext(token);
        if (!cancelled) setContext(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load review form");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return <PageLoader label="Loading…" />;
  if (error) {
    return <div className="rounded-2xl border bg-card p-6 text-center text-sm text-red-600">{error}</div>;
  }
  if (!context || !token) return null;
  return <PublicReviewForm token={token} context={context} />;
}

export default function PublicReviewPage() {
  return (
    <main className="min-h-dvh bg-[var(--surface-muted)] px-4 py-10">
      <div className="mx-auto max-w-md">
        <Suspense fallback={<PageLoader label="Loading…" />}>
          <PublicReviewContent />
        </Suspense>
      </div>
    </main>
  );
}
