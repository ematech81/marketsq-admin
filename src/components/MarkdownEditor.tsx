"use client";

import { useRef, useState } from "react";
import RichText from "./RichText";

type Props = { label: string; value: string; onChange: (next: string) => void; hint?: string; rows?: number };

// A description box with a formatting toolbar: headings (H1 to H3), bold, italic, bullet and numbered lists, and links.
// The text is stored as Markdown, a plain-text way of writing formatting ("## Heading", "**bold**", "- item").
export default function MarkdownEditor({ label, value, onChange, hint, rows = 10 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Apply a change to the text, then put the cursor/selection where it should be.
  function apply(next: string, selStart: number, selEnd: number) {
    onChange(next);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  // Put marks around the selection (bold, italic, link). With nothing selected, a placeholder is inserted and selected.
  function wrap(before: string, after: string, placeholder: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = value.slice(s, e);
    const inner = selected || placeholder;
    const already = value.slice(s - before.length, s) === before && value.slice(e, e + after.length) === after;
    if (already && selected) {
      // Clicking bold again on bold text removes it.
      apply(value.slice(0, s - before.length) + selected + value.slice(e + after.length), s - before.length, e - before.length);
      return;
    }
    const next = value.slice(0, s) + before + inner + after + value.slice(e);
    apply(next, s + before.length, s + before.length + inner.length);
  }

  // The lines touched by the selection.
  function lineRange() {
    const el = ref.current!;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const endIdx = value.indexOf("\n", el.selectionEnd);
    const end = endIdx === -1 ? value.length : endIdx;
    return { start, end };
  }

  // Headings: "# ", "## ", "### " at the start of each selected line. Clicking the same level again removes it.
  function heading(level: 1 | 2 | 3) {
    if (!ref.current) return;
    const { start, end } = lineRange();
    const mark = "#".repeat(level) + " ";
    const lines = value.slice(start, end).split("\n");
    const allHave = lines.every((l) => l.startsWith(mark));
    const out = lines.map((l) => {
      const bare = l.replace(/^#{1,6}\s+/, "");
      return allHave ? bare : mark + bare;
    });
    const text = out.join("\n");
    apply(value.slice(0, start) + text + value.slice(end), start, start + text.length);
  }

  // Lists: "- " for bullets, "1. 2. 3." for numbers.
  function list(kind: "bullet" | "number") {
    if (!ref.current) return;
    const { start, end } = lineRange();
    const lines = value.slice(start, end).split("\n");
    const isThisKind = (l: string) => (kind === "bullet" ? /^\s*[-*+]\s+/.test(l) : /^\s*\d+\.\s+/.test(l));
    const strip = (l: string) => l.replace(/^\s*([-*+]|\d+\.)\s+/, "");
    const allHave = lines.every(isThisKind);
    const out = lines.map((l, i) => (allHave ? strip(l) : kind === "bullet" ? `- ${strip(l)}` : `${i + 1}. ${strip(l)}`));
    const text = out.join("\n");
    apply(value.slice(0, start) + text + value.slice(end), start, start + text.length);
  }

  function link() {
    const el = ref.current;
    if (!el) return;
    const url = window.prompt("Where should the link go? (a full address starting with https://)");
    if (!url) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const text = value.slice(s, e) || "link text";
    const md = `[${text}](${url.trim()})`;
    apply(value.slice(0, s) + md + value.slice(e), s + 1, s + 1 + text.length);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key.toLowerCase() === "b") {
      e.preventDefault();
      wrap("**", "**", "bold text");
    } else if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      wrap("*", "*", "italic text");
    }
  }

  const tool =
    "inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-sm px-2 text-sm font-semibold text-[#45474B] hover:bg-white hover:text-foreground";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <div role="tablist" className="flex gap-1 text-[13px]">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`cursor-pointer rounded-sm border px-2.5 py-1 capitalize ${
                tab === t ? "border-[#C6C6CB] bg-[#F3F4F5] font-semibold" : "border-transparent hover:border-[#C6C6CB]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "write" ? (
        <>
          <div className="flex flex-wrap items-center gap-0.5 border border-b-0 border-[#C6C6CB] bg-[#F3F4F5] p-1" role="toolbar" aria-label="Formatting">
            <button type="button" className={tool} onClick={() => heading(1)} title="Heading 1 (the biggest)">
              H1
            </button>
            <button type="button" className={tool} onClick={() => heading(2)} title="Heading 2">
              H2
            </button>
            <button type="button" className={tool} onClick={() => heading(3)} title="Heading 3">
              H3
            </button>
            <span className="mx-1 h-5 w-px bg-[#C6C6CB]" aria-hidden />
            <button type="button" className={`${tool} font-bold`} onClick={() => wrap("**", "**", "bold text")} title="Bold (Ctrl+B)" aria-label="Bold">
              B
            </button>
            <button type="button" className={`${tool} italic`} onClick={() => wrap("*", "*", "italic text")} title="Italic (Ctrl+I)" aria-label="Italic">
              I
            </button>
            <span className="mx-1 h-5 w-px bg-[#C6C6CB]" aria-hidden />
            <button type="button" className={tool} onClick={() => list("bullet")} title="Bullet list" aria-label="Bullet list">
              • List
            </button>
            <button type="button" className={tool} onClick={() => list("number")} title="Numbered list" aria-label="Numbered list">
              1. List
            </button>
            <span className="mx-1 h-5 w-px bg-[#C6C6CB]" aria-hidden />
            <button type="button" className={tool} onClick={link} title="Add a link" aria-label="Add a link">
              Link
            </button>
          </div>
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={rows}
            required
            minLength={10}
            className="box-border w-full resize-y rounded-b-sm border border-[#C6C6CB] bg-white p-3.5 font-mono text-[14px] leading-relaxed outline-none focus:border-accent"
          />
        </>
      ) : (
        <div className="min-h-48 rounded-sm border border-[#C6C6CB] bg-white p-4">
          {value.trim() ? <RichText>{value}</RichText> : <p className="text-sm text-muted">Nothing to preview yet.</p>}
        </div>
      )}

      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}
