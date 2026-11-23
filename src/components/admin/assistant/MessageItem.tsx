"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, ChevronDown, Copy, Loader2, Pencil, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertBanner } from "@/components/ui";
import { Markdown } from "./Markdown";
import { summariseSteps, type ChatMsg } from "./conversations";

type Props = {
  msg: ChatMsg;
  isLast: boolean;
  streaming: boolean;
  /** Where the last question can still be edited: only when nothing is being answered. */
  canEdit: boolean;
  onEdit: (id: string, text: string) => void;
  onRegenerate: () => void;
  onContinue: () => void;
};

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return { copied, copy };
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
    >
      {children}
    </button>
  );
}

/** What Antra looked up. Open while it works; collapses to a one-line summary once the answer is in. */
function Steps({ msg, running }: { msg: ChatMsg; running: boolean }) {
  const t = useTranslations("admin.assistant");
  const [open, setOpen] = useState(false);
  const steps = summariseSteps(msg.tools ?? []);
  if (steps.length === 0) return null;
  const anyFailed = steps.some((s) => s.failed > 0);
  const summary = steps.map((s) => s.label.replace(/^Checking /, "").replace(/^Looking up /, "")).join(", ");

  const rows = (
    <ul className="flex flex-wrap gap-1.5" aria-label={t("steps")}>
      {steps.map((s) => (
        <li key={s.label} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
          {s.running > 0 ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : s.failed > 0 ? (
            <XCircle className="h-3 w-3 text-red-600" aria-hidden />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
          )}
          {s.label}
          {s.count > 1 ? ` ×${s.count}` : ""}
          {s.running === 0 && s.ms > 0 ? <span className="text-[var(--text-tertiary)]">· {(s.ms / 1000).toFixed(1)}s</span> : null}
        </li>
      ))}
    </ul>
  );

  if (running) return rows;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg py-0.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      >
        {anyFailed ? <XCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />}
        <span>{t("checked", { what: summary })}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="mt-1.5">{rows}</div>}
    </div>
  );
}

function UserMessage({ msg, canEdit, onEdit }: Pick<Props, "msg" | "canEdit" | "onEdit">) {
  const t = useTranslations("admin.assistant");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);
  const { copied, copy } = useCopy(msg.content);

  if (editing) {
    return (
      <div className="ml-auto w-full max-w-[92%] rounded-2xl border border-[var(--brand)] bg-[var(--surface)] p-2 sm:max-w-[80%]">
        <textarea
          autoFocus
          value={draft}
          rows={Math.min(8, Math.max(2, draft.split("\n").length))}
          maxLength={4000}
          aria-label={t("edit")}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full resize-none bg-transparent p-1.5 text-[15px] leading-6 outline-none"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => { setEditing(false); setDraft(msg.content); }} className="rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]">
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => { setEditing(false); onEdit(msg.id, draft.trim()); }}
            className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-[13px] font-semibold text-[var(--brand-on-brand)] disabled:opacity-50"
          >
            {t("saveAndSend")}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="max-w-[92%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-[var(--brand-light)] px-4 py-2.5 text-[15px] leading-6 text-[var(--text-primary)] sm:max-w-[80%]">
        {msg.content}
      </div>
      <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
        <ActionButton label={copied ? t("copied") : t("copy")} onClick={() => void copy()}>
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        </ActionButton>
        {canEdit && (
          <ActionButton label={t("edit")} onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </ActionButton>
        )}
      </div>
    </div>
  );
}

function AssistantMessage({ msg, isLast, streaming, onRegenerate, onContinue }: Props) {
  const t = useTranslations("admin.assistant");
  const running = streaming && isLast;
  const { copied, copy } = useCopy(msg.content);
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--brand-on-brand)]" aria-hidden>
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <Steps msg={msg} running={running} />
        {msg.content ? (
          <Markdown text={msg.content} className="text-[15px] leading-7" />
        ) : running && !msg.error ? (
          <p className="flex items-center gap-1.5 py-1 text-[var(--text-tertiary)]" role="status">
            <span className="sr-only">{t("thinking")}</span>
            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
          </p>
        ) : null}
        {running && msg.content && <span className="inline-block h-4 w-[3px] animate-pulse rounded-sm bg-[var(--brand)] align-middle" aria-hidden />}
        {msg.error && <AlertBanner variant="error">{msg.error}</AlertBanner>}
        {msg.stopped && !running && <p className="text-[12px] italic text-[var(--text-tertiary)]">{t("stopped")}</p>}
        {msg.truncated && !running && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <span className="flex-1">{t("cutOff")}</span>
            <button type="button" onClick={onContinue} className="rounded-lg bg-amber-600 px-3 py-1 text-[12px] font-semibold text-white hover:bg-amber-700">
              {t("continue")}
            </button>
          </div>
        )}
        {!running && (msg.content || msg.error) && (
          <div className="-ml-2 flex">
            {msg.content && (
              <ActionButton label={copied ? t("copied") : t("copy")} onClick={() => void copy()}>
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                <span className="max-sm:hidden">{copied ? t("copied") : t("copy")}</span>
              </ActionButton>
            )}
            {isLast && (
              <ActionButton label={t("regenerate")} onClick={onRegenerate}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                <span className="max-sm:hidden">{t("regenerate")}</span>
              </ActionButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageItem = memo(function MessageItem(props: Props) {
  return props.msg.role === "user" ? (
    <UserMessage msg={props.msg} canEdit={props.canEdit} onEdit={props.onEdit} />
  ) : (
    <AssistantMessage {...props} />
  );
});
