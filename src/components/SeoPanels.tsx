"use client";

import { plainText, searchPreview, SITE_NAME } from "@/lib/seo";
import type { ProductValues } from "@/lib/productForm";

// How the product will look in Google search results. Google cuts titles near 60 characters and descriptions near 160.
export function SearchPreview({ v }: { v: ProductValues }) {
  const p = searchPreview(v);
  const title = p.title.length > 62 ? `${p.title.slice(0, 60).trim()}…` : p.title;
  const description = p.description.length > 160 ? `${p.description.slice(0, 158).trim()}…` : p.description;

  return (
    <div className="rounded-sm border border-line bg-white p-4" aria-label="Google search preview">
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">How it can look on Google</p>
      <p className="truncate text-[13px] text-[#4D5156]">{p.url}</p>
      <p className="mt-0.5 text-[20px] leading-snug text-[#1A0DAB]">{title}</p>
      <p className="mt-1 text-[14px] leading-snug text-[#4D5156]">{description}</p>
    </div>
  );
}

type Check = { ok: boolean; label: string; tip: string };

// What a product still needs to do well in search. Each item is a small, concrete thing a person can fix.
export function seoChecks(v: ProductValues): Check[] {
  const effectiveTitle = (v.seoTitle.trim() || `${v.title.trim()} | ${SITE_NAME}`).length;
  const description = v.seoDescription.trim() || plainText(v.description);
  const photos = v.images.length;
  const described = v.images.filter((i) => i.alt.trim().length >= 5).length;

  return [
    {
      ok: v.title.trim().split(/\s+/).filter(Boolean).length >= 3,
      label: "Product name has at least 3 words",
      tip: 'Say what it is, like "HP 250 G5 Laptop, 8GB RAM". People search with several words.',
    },
    {
      ok: effectiveTitle >= 30 && effectiveTitle <= 65,
      label: "Search title is 30 to 65 characters",
      tip: "Google cuts long titles. Write your own under Search listing if the automatic one is too short or too long.",
    },
    {
      ok: description.length >= 70 && description.length <= 300 && (v.seoDescription.trim() === "" || v.seoDescription.trim().length <= 160),
      label: "Search description is about 70 to 160 characters",
      tip: "A short summary that makes people want to click. Mention the brand and what makes it useful.",
    },
    {
      ok: photos > 0 && described === photos,
      label: photos === 0 ? "Add at least one photo" : "Every photo has a description",
      tip: "Describe each photo in a few words. This is how Google understands the pictures.",
    },
    {
      ok: plainText(v.description).length >= 150,
      label: "Description has at least 150 characters",
      tip: "Longer, helpful descriptions rank better. Add what it is, who it is for, and the main features.",
    },
    {
      ok: v.tags.length >= 3,
      label: "At least 3 tags",
      tip: 'Add the words people would type, like "washing machine", "home appliances".',
    },
    {
      ok: v.brand.trim().length > 0,
      label: "Brand is filled in",
      tip: "Google shows the brand next to the product and uses it to match searches.",
    },
    {
      ok: v.details.length >= 2,
      label: "At least 2 product details",
      tip: "Size, weight, material, warranty. Details help buyers and help Google.",
    },
  ];
}

// The right-hand checklist with a progress bar.
export function SeoChecklist({ v }: { v: ProductValues }) {
  const checks = seoChecks(v);
  const done = checks.filter((c) => c.ok).length;
  const percent = Math.round((done / checks.length) * 100);
  const tone = percent >= 80 ? "bg-[#166534]" : percent >= 50 ? "bg-accent" : "bg-[#B42318]";

  return (
    <section className="rounded-sm border border-line bg-white p-5" aria-label="Search checklist">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold">Search checklist</h3>
        <span className="text-sm font-semibold">{percent}%</span>
      </div>
      <div className="mb-4 h-2 w-full bg-surface" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Search checklist progress">
        <div className={`h-2 ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <ul className="flex flex-col gap-2.5 text-[13px]">
        {checks.map((c) => (
          <li key={c.label} className="flex gap-2.5">
            <span aria-hidden className={`mt-0.5 flex size-4 shrink-0 items-center justify-center text-[11px] font-bold text-white ${c.ok ? "bg-[#166534]" : "bg-[#C6C6CB]"}`}>
              {c.ok ? "✓" : ""}
            </span>
            <span>
              <span className={c.ok ? "text-foreground" : "font-medium text-foreground"}>
                <span className="sr-only">{c.ok ? "Done: " : "To do: "}</span>
                {c.label}
              </span>
              {!c.ok && <span className="block text-muted">{c.tip}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
