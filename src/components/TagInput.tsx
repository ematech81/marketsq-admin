"use client";

import { useState } from "react";

type Props = { label: string; tags: string[]; onChange: (next: string[]) => void; max?: number; hint?: string };

// Tags as little chips. Type a word and press Enter or comma to add it. Backspace on an empty box removes the last one.
export default function TagInput({ label, tags, onChange, max = 15, hint }: Props) {
  const [text, setText] = useState("");

  function add(raw: string) {
    const clean = raw.trim().toLowerCase().slice(0, 30);
    setText("");
    if (!clean || tags.includes(clean) || tags.length >= max) return;
    onChange([...tags, clean]);
  }

  return (
    <div>
      <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium" htmlFor="tag-input">
        <span>{label}</span>
        <span className="text-[13px] font-normal text-muted">
          {tags.length} of {max}
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2 rounded-sm border border-[#C6C6CB] bg-white p-2 focus-within:border-accent">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-[#F3F4F5] py-1 pr-1 pl-2.5 text-[13px]">
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              aria-label={`Remove tag ${t}`}
              className="flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted hover:bg-white hover:text-[#B42318]"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="tag-input"
          value={text}
          disabled={tags.length >= max}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) {
              v.split(",").forEach(add);
            } else {
              setText(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => add(text)}
          placeholder={tags.length === 0 ? "e.g. washing machine" : "Add a tag…"}
          className="min-w-32 flex-1 border-0 bg-transparent px-1 py-1.5 text-[15px] outline-none"
        />
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}
