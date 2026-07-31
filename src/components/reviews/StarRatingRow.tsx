"use client";

import { Star } from "lucide-react";

type Props = {
  label: string;
  value: number | null;
  hover: number | null;
  onChange: (value: number) => void;
  onHover: (value: number | null) => void;
  size?: "lg" | "md";
  required?: boolean;
};

export function StarRatingRow({
  label,
  value,
  hover,
  onChange,
  onHover,
  size = "md",
  required = false,
}: Props) {
  const displayRating = hover ?? value ?? 0;
  const starClass = size === "lg" ? "w-10 h-10" : "w-7 h-7";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium min-w-0 flex-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="flex gap-1 shrink-0">
        {[1, 2, 3, 4, 5].map((starValue) => (
          <button
            key={starValue}
            type="button"
            aria-label={`${label}: ${starValue} stars`}
            onMouseEnter={() => onHover(starValue)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onChange(starValue)}
            className="p-0.5"
          >
            <Star
              className={`${starClass} ${
                starValue <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
