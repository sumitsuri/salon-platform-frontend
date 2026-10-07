"use client";

import { useState } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui";

type StaffPasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  onGenerate?: () => void;
  generating?: boolean;
  generateLabel?: string;
  className?: string;
  readOnly?: boolean;
};

export function StaffPasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = "new-password",
  onGenerate,
  generating,
  generateLabel = "Generate",
  className,
  readOnly = false,
}: StaffPasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative min-w-0 flex-1">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          readOnly={readOnly}
          className={cn(inputClass, "pr-10", readOnly && "bg-[var(--surface-muted)]")}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            if (!readOnly) onChange(e.target.value);
          }}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {onGenerate && !readOnly ? (
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
          disabled={generating}
          onClick={onGenerate}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {generating ? "…" : generateLabel}
        </button>
      ) : null}
    </div>
  );
}
