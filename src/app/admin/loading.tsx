/** Instant route transition skeleton — no fade-in delay. */
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-8 w-44 max-w-[60%] rounded-lg bg-[var(--surface-muted)] animate-pulse" />
        <div className="h-4 w-72 max-w-full rounded-md bg-[var(--surface-muted)] animate-pulse" />
      </div>
      <div className="h-11 w-full max-w-xs rounded-xl bg-[var(--surface-muted)] animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-[var(--surface-muted)] animate-pulse" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-[var(--surface-muted)] animate-pulse" />
    </div>
  );
}
