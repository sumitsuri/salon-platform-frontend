"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupConversations, type Conversation } from "./conversations";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

/** The chat history list: new chat, search, date groups, rename and delete. Used as a column and as a drawer. */
export function ChatSidebar({ conversations, activeId, disabled, onSelect, onNew, onRename, onDelete }: Props) {
  const t = useTranslations("admin.assistant");
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const groups = useMemo(() => groupConversations(conversations, query), [conversations, query]);

  const startRename = (c: Conversation) => {
    setConfirmId(null);
    setRenamingId(c.id);
    setDraftTitle(c.title || t("newChat"));
  };
  const commitRename = () => {
    if (renamingId && draftTitle.trim()) onRename(renamingId, draftTitle.trim());
    setRenamingId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={onNew}
          disabled={disabled}
          title={`${t("newChat")} (Ctrl+Shift+O)`}
          className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--brand-light)] hover:text-[var(--brand-text)] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden /> {t("newChat")}
        </button>
        <label className="relative block">
          <span className="sr-only">{t("searchChats")}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchChats")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] py-2 pl-8 pr-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand)] focus:bg-[var(--surface)]"
          />
        </label>
      </div>

      <nav aria-label={t("history")} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 && <p className="px-3 py-4 text-[13px] text-[var(--text-tertiary)]">{t("noHistory")}</p>}
        {conversations.length > 0 && groups.length === 0 && <p className="px-3 py-4 text-[13px] text-[var(--text-tertiary)]">{t("noMatches")}</p>}
        {groups.map(({ group, items }) => (
          <div key={group} className="mb-3">
            <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{t(group)}</h3>
            <ul className="space-y-0.5">
              {items.map((c) => {
                const active = c.id === activeId;
                if (renamingId === c.id) {
                  return (
                    <li key={c.id} className="flex items-center gap-1 px-1">
                      <input
                        autoFocus
                        value={draftTitle}
                        maxLength={80}
                        aria-label={t("renameChat")}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-[var(--brand)] bg-[var(--surface)] px-2 py-1.5 text-[13px] outline-none"
                      />
                      <button type="button" onClick={commitRename} aria-label={t("save")} className="rounded-md p-1.5 text-emerald-600 hover:bg-[var(--surface-muted)]">
                        <Check className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" onClick={() => setRenamingId(null)} aria-label={t("cancel")} className="rounded-md p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)]">
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                }
                if (confirmId === c.id) {
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] dark:bg-red-950/30">
                      <span className="truncate text-red-700 dark:text-red-300">{t("confirmDelete")}</span>
                      <span className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => { onDelete(c.id); setConfirmId(null); }} className="rounded-md bg-red-600 px-2 py-0.5 text-[12px] font-semibold text-white">
                          {t("delete")}
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="rounded-md px-2 py-0.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface)]">
                          {t("cancel")}
                        </button>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      disabled={disabled && !active}
                      aria-current={active ? "true" : undefined}
                      title={c.title || t("newChat")}
                      className={cn(
                        "block w-full truncate rounded-lg px-3 py-2 pr-[4.25rem] text-left text-[13px] transition-colors",
                        active ? "bg-[var(--brand-light)] font-semibold text-[var(--brand-text)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                      )}
                    >
                      {c.title || t("newChat")}
                    </button>
                    <span className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                      <button type="button" onClick={() => startRename(c)} aria-label={t("renameChat")} className="rounded-md p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]">
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => setConfirmId(c.id)} aria-label={t("deleteChat")} className="rounded-md p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface)] hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
