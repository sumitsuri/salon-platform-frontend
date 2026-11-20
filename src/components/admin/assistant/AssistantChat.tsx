"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowUp, Check, CheckCircle2, Copy, Loader2, MessageSquare, Plus, Sparkles, Square, Trash2, XCircle } from "lucide-react";
import { api, streamAssistantChat, type AssistantMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { AlertBanner } from "@/components/ui";
import { Markdown } from "./Markdown";

type ToolRun = { name: string; label: string; status: "running" | "ok" | "failed"; ms?: number };
type ChatMsg = { id: string; role: "user" | "assistant"; content: string; tools?: ToolRun[]; error?: string };
type Conversation = { id: string; title: string; updatedAt: number; messages: ChatMsg[] };

const MAX_CONVERSATIONS = 20;
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));

function loadConversations(key: string): Conversation[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function saveConversations(key: string, list: Conversation[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_CONVERSATIONS)));
  } catch {
    /* storage full or blocked: the chat still works, it just will not be remembered */
  }
}

export function AssistantChat() {
  const t = useTranslations("admin.assistant");
  const userId = useAuthStore((s) => s.user?.userId);
  const storageKey = `antra.assistant.v1.${userId ?? "anon"}`;

  const status = useQuery({ queryKey: ["assistant-status"], queryFn: () => api.getAssistantStatus(), staleTime: 60_000 });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved chats once the user is known.
  useEffect(() => {
    const saved = loadConversations(storageKey);
    setConversations(saved);
    setActiveId(saved[0]?.id ?? null);
  }, [storageKey]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);
  const messages = useMemo(() => active?.messages ?? [], [active]);

  const persist = useCallback(
    (next: Conversation[]) => {
      setConversations(next);
      saveConversations(storageKey, next);
    },
    [storageKey]
  );

  // Keep the newest text in view unless the reader scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = messages.length === 0 ? 0 : el.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || streaming) return;
      setDraft("");
      stickToBottom.current = true;

      const userMsg: ChatMsg = { id: uid(), role: "user", content: text };
      const assistantMsg: ChatMsg = { id: uid(), role: "assistant", content: "", tools: [] };
      const base = conversations.find((c) => c.id === activeId);
      const conv: Conversation = base
        ? { ...base, messages: [...base.messages, userMsg, assistantMsg], updatedAt: Date.now() }
        : { id: uid(), title: text.slice(0, 60), messages: [userMsg, assistantMsg], updatedAt: Date.now() };
      const rest = conversations.filter((c) => c.id !== conv.id);
      let working = conv;
      const commit = (c: Conversation) => {
        working = c;
        setConversations([c, ...rest]);
      };
      setActiveId(conv.id);
      commit(conv);

      const patchAssistant = (fn: (m: ChatMsg) => ChatMsg) =>
        commit({ ...working, messages: working.messages.map((m) => (m.id === assistantMsg.id ? fn(m) : m)) });

      const history: AssistantMessage[] = conv.messages
        .filter((m) => m.id !== assistantMsg.id && m.content.trim() && !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      try {
        await streamAssistantChat(
          history,
          (event) => {
            if (event.type === "text") {
              patchAssistant((m) => ({ ...m, content: m.content + event.t }));
            } else if (event.type === "tool") {
              patchAssistant((m) => {
                const tools = [...(m.tools ?? [])];
                if (event.phase === "start") {
                  tools.push({ name: event.name, label: event.label ?? event.name, status: "running" });
                } else {
                  const idx = tools.map((x) => x.name).lastIndexOf(event.name);
                  if (idx >= 0) tools[idx] = { ...tools[idx], status: event.ok ? "ok" : "failed", ms: event.ms };
                }
                return { ...m, tools };
              });
            } else if (event.type === "error") {
              patchAssistant((m) => ({ ...m, error: event.message }));
            }
          },
          controller.signal
        );
      } catch (e) {
        if (!controller.signal.aborted) {
          patchAssistant((m) => ({ ...m, error: e instanceof Error ? e.message : t("errorGeneric") }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
        // Anything still "running" when the stream ends was cut off.
        patchAssistant((m) => ({
          ...m,
          tools: (m.tools ?? []).map((x) => (x.status === "running" ? { ...x, status: "failed" as const } : x)),
        }));
        persist([working, ...rest]);
      }
    },
    [activeId, conversations, persist, streaming, t]
  );

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    if (streaming) return;
    setActiveId(null);
    setShowHistory(false);
    setDraft("");
    textareaRef.current?.focus();
  };

  const removeConversation = (id: string) => {
    const next = conversations.filter((c) => c.id !== id);
    persist(next);
    if (id === activeId) setActiveId(next[0]?.id ?? null);
  };

  const copy = async (m: ChatMsg) => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const disabled = status.data && !status.data.enabled;
  const suggestions = [t("suggestions.sales"), t("suggestions.compare"), t("suggestions.busy"), t("suggestions.staff"), t("suggestions.stock"), t("suggestions.profit")];

  const historyList = (
    <ul className="space-y-0.5">
      {conversations.length === 0 && <li className="px-3 py-2 text-[13px] text-[var(--text-tertiary)]">{t("noHistory")}</li>}
      {conversations.map((c) => (
        <li key={c.id} className="group flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (streaming) return;
              setActiveId(c.id);
              setShowHistory(false);
            }}
            className={cn(
              "min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
              c.id === activeId ? "bg-[var(--brand-light)] font-semibold text-[var(--brand-text)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
            )}
          >
            {c.title}
          </button>
          <button
            type="button"
            onClick={() => removeConversation(c.id)}
            aria-label={t("deleteChat")}
            className="rounded-md p-1.5 text-[var(--text-tertiary)] opacity-0 transition-opacity hover:text-red-600 focus:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-[calc(100dvh-17.5rem)] min-h-[24rem] gap-4 nav:h-[calc(100dvh-13rem)]">
      {/* History: a column on large screens, a drop-down panel elsewhere */}
      <aside className="hidden w-60 shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 lg:flex">
        <button
          type="button"
          onClick={newChat}
          className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--brand-text)] hover:bg-[var(--brand-light)]"
        >
          <Plus className="h-4 w-4" aria-hidden /> {t("newChat")}
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto">{historyList}</div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
            aria-expanded={showHistory}
          >
            <MessageSquare className="h-4 w-4" aria-hidden /> {t("history")}
          </button>
          <button type="button" onClick={newChat} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[var(--brand-text)] hover:bg-[var(--brand-light)]">
            <Plus className="h-4 w-4" aria-hidden /> {t("newChat")}
          </button>
        </div>
        {showHistory && <div className="absolute inset-x-0 top-[3.1rem] z-10 max-h-[60%] overflow-y-auto border-b border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg lg:hidden">{historyList}</div>}

        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center py-2 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-light)] text-[var(--brand-text)]">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("greeting")}</h2>
              <p className="mt-1 max-w-md text-[13px] text-[var(--text-secondary)]">{t("greetingHint")}</p>
              {disabled && (
                <div className="mt-4 w-full text-left">
                  <AlertBanner variant="warning">{t("notEnabled")}</AlertBanner>
                </div>
              )}
              <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={!!disabled}
                    onClick={() => void send(s)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-left text-[13px] text-[var(--text-primary)] transition-colors hover:border-[var(--border-brand)] hover:bg-[var(--brand-light)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((m, idx) => {
                const last = idx === messages.length - 1;
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[var(--brand-light)] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)] sm:max-w-[75%]">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                const running = streaming && last;
                return (
                  <div key={m.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--brand-on-brand)]">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      {(m.tools?.length ?? 0) > 0 && (
                        <ul className="flex flex-wrap gap-1.5" aria-label={t("steps")}>
                          {m.tools!.map((tool, n) => (
                            <li
                              key={`${tool.name}-${n}`}
                              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
                            >
                              {tool.status === "running" ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              ) : tool.status === "ok" ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" aria-hidden />
                              )}
                              {tool.label}
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.content ? (
                        <Markdown text={m.content} />
                      ) : running && !m.error ? (
                        <p className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {t("thinking")}
                        </p>
                      ) : null}
                      {m.error && <AlertBanner variant="error">{m.error}</AlertBanner>}
                      {m.content && !running && (
                        <button
                          type="button"
                          onClick={() => void copy(m)}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-secondary)]"
                        >
                          {copiedId === m.id ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                          {copiedId === m.id ? t("copied") : t("copy")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:px-6">
          <form
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-ring)]"
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              rows={1}
              disabled={!!disabled}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              maxLength={4000}
              className="max-h-[180px] min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-50"
            />
            {streaming ? (
              <button type="button" onClick={stop} aria-label={t("stop")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--text-primary)] text-[var(--surface)]">
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim() || !!disabled}
                aria-label={t("send")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-[var(--brand-on-brand)] transition-opacity disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
            )}
          </form>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-[var(--text-tertiary)]">{t("disclaimer")}</p>
        </div>
      </section>
    </div>
  );
}
