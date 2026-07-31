"use client";

type Props = {
  label: string;
  selected: boolean;
  onToggle: () => void;
};

export function ReviewTagChip({ label, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-label={`Tag: ${label}`}
      aria-pressed={selected}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={[
        "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all touch-manipulation select-none",
        selected
          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/25"
          : "border-border bg-background text-foreground active:bg-muted",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
