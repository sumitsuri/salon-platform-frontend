"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small, safe markdown renderer for assistant answers: paragraphs, headings, bold/italic, inline code, code
 * blocks, lists, quotes, links and tables. It builds React elements only (never raw HTML), so a model or a
 * tool result cannot inject markup.
 */

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(pattern)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) {
      out.push(<strong key={key} className="font-semibold text-[var(--text-primary)]">{inline(tok.slice(2, -2), key)}</strong>);
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-[var(--surface-muted)] px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("[")) {
      const close = tok.indexOf("](");
      const label = tok.slice(1, close);
      const href = tok.slice(close + 2, -1);
      out.push(
        SAFE_LINK.test(href) ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--brand-text)] underline underline-offset-2">
            {label}
          </a>
        ) : (
          label
        )
      );
    } else {
      out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>);
    }
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

const isTableSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const isTableRow = (line: string) => line.includes("|");

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text can still be selected by hand */
    }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-tertiary)]">
        <span className="font-medium uppercase tracking-wide">{lang || "text"}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-[var(--surface)] hover:text-[var(--text-secondary)]"
        >
          {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(<CodeBlock key={key++} lang={lang} code={code.join("\n")} />);
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        <p key={key++} className={cn("font-semibold text-[var(--text-primary)]", level <= 2 ? "pt-1 text-[15px]" : "text-[14px]")}>
          {inline(heading[2], `h${key}`)}
        </p>
      );
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) => (c.endsWith(":") ? (c.startsWith(":") ? "center" : "right") : "left"));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && isTableRow(lines[i])) rows.push(splitRow(lines[i++]));
      blocks.push(
        <div key={key++} className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-max border-collapse text-[13px]">
            <thead>
              <tr>
                {head.map((h, c) => (
                  <th key={c} className="border-b border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2 text-left font-semibold text-[var(--text-secondary)]" style={{ textAlign: align[c] as "left" }}>
                    {inline(h, `th${key}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-[var(--border)] last:border-0">
                  {r.map((cell, c) => (
                    <td key={c} className="px-3 py-2 align-top tabular-nums" style={{ textAlign: align[c] as "left" }}>
                      {inline(cell, `td${key}-${ri}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^\s*([-*•])\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/.test(lines[i]) : /^\s*([-*•])\s+/.test(lines[i]))) {
        items.push(lines[i++].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*([-*•])\s+/, ""));
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key++} className={cn("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
          {items.map((item, n) => (
            <li key={n} className="pl-0.5 marker:text-[var(--text-tertiary)]">
              {inline(item, `li${key}-${n}`)}
            </li>
          ))}
        </List>
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-[var(--border-strong)] pl-3 text-[var(--text-secondary)]">
          {inline(quote.join(" "), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|>|\s*([-*•]|\d+[.)])\s)/.test(lines[i]) && !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1]))) {
      para.push(lines[i++]);
    }
    blocks.push(
      <p key={key++}>
        {para.map((p, n) => (
          <Fragment key={n}>
            {n > 0 && <br />}
            {inline(p, `p${key}-${n}`)}
          </Fragment>
        ))}
      </p>
    );
  }

  return <div className={cn("space-y-3 text-[14px] leading-relaxed text-[var(--text-primary)]", className)}>{blocks}</div>;
}
