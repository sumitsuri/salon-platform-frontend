/** Inline loading placeholder for admin data sections — does not hide page shell. */
export function AdminDataSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading data">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 rounded-xl bg-[var(--surface-muted)] animate-pulse" />
      ))}
    </div>
  );
}
