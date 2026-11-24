export type ToolRun = { name: string; label: string; status: "running" | "ok" | "failed"; ms?: number };

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: ToolRun[];
  error?: string;
  /** The model ran out of room and could not finish the answer. */
  truncated?: boolean;
  /** The reader pressed Stop. */
  stopped?: boolean;
  /** Antra declined or answered without the AI model (off topic, greeting, a secret in the question). */
  blocked?: string;
  /** The question held a password or key and was removed from this chat; it is never sent again. */
  removed?: boolean;
  /** The question was spoken: which speech engine wrote it down and in which language (for quality tracking). */
  voice?: { engine: string; lang: string };
  /** What the reader said about this answer. */
  feedback?: { rating?: "UP" | "DOWN"; reasons?: string[]; heard?: boolean };
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMsg[];
};

const MAX_CONVERSATIONS = 50;

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2);

export function loadConversations(key: string): Conversation[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as Conversation[]) : [];
    return Array.isArray(parsed) ? cleanTitles(parsed) : [];
  } catch {
    return [];
  }
}

export function saveConversations(key: string, list: Conversation[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_CONVERSATIONS)));
  } catch {
    /* storage full or blocked: the chat still works, it just will not be remembered */
  }
}

export type DateGroup = "today" | "yesterday" | "previous7" | "older";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function groupOf(updatedAt: number, now: Date = new Date()): DateGroup {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(updatedAt))) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 7) return "previous7";
  return "older";
}

/** Newest first, split into the groups the sidebar shows; empty groups are left out. */
export function groupConversations(list: Conversation[], query = "", now: Date = new Date()) {
  const q = query.trim().toLowerCase();
  const filtered = q ? list.filter((c) => c.title.toLowerCase().includes(q)) : list;
  const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  const order: DateGroup[] = ["today", "yesterday", "previous7", "older"];
  return order
    .map((group) => ({ group, items: sorted.filter((c) => groupOf(c.updatedAt, now) === group) }))
    .filter((g) => g.items.length > 0);
}

/** Collapses repeated lookups into one entry with a count, e.g. "Checking sales x3". */
export function summariseSteps(tools: ToolRun[]) {
  const byLabel = new Map<string, { label: string; count: number; failed: number; running: number; ms: number }>();
  for (const t of tools) {
    const e = byLabel.get(t.label) ?? { label: t.label, count: 0, failed: 0, running: 0, ms: 0 };
    e.count += 1;
    if (t.status === "failed") e.failed += 1;
    if (t.status === "running") e.running += 1;
    e.ms += t.ms ?? 0;
    byLabel.set(t.label, e);
  }
  return [...byLabel.values()];
}

export function greetingKey(now: Date = new Date()): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  const h = now.getHours();
  if (h < 12) return "greetingMorning";
  if (h < 17) return "greetingAfternoon";
  return "greetingEvening";
}

/** A chat's title is the start of its first safe question. Empty until there is one; the screens then say "New chat". */
export const titleFrom = (text: string) => text.trim().replace(/\s+/g, " ").slice(0, 60);

/**
 * Chats saved before titles ignored refused messages may be named after something that was refused (a password,
 * for example). Clear those titles: a title is kept only if it comes from a question that was answered.
 */
export function cleanTitles(list: Conversation[]): Conversation[] {
  return list.map((c) => {
    if (!c.title) return c;
    const msgs = c.messages;
    const refused = (i: number) => msgs[i].role === "user" && (!!msgs[i].removed || !!msgs[i + 1]?.blocked);
    const anyRefused = msgs.some((_, i) => refused(i));
    if (!anyRefused) return c;
    const fromAnswered = msgs.some((m, i) => m.role === "user" && !refused(i) && titleFrom(m.content) === c.title);
    return fromAnswered ? c : { ...c, title: "" };
  });
}

const PREFILL_KEY = "antra.assistant.prefill";

/** Another page (the forecast) hands the chat a ready question. It only fills the box; it is never sent for the person. */
export function setPrefill(question: string) {
  try {
    sessionStorage.setItem(PREFILL_KEY, question);
  } catch {
    /* private mode: the chat just opens empty */
  }
}

export function takePrefill(): string | null {
  try {
    const q = sessionStorage.getItem(PREFILL_KEY);
    if (q) sessionStorage.removeItem(PREFILL_KEY);
    return q;
  } catch {
    return null;
  }
}
