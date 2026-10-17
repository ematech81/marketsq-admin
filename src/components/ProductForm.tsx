"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { flatten, pathLabel } from "@/lib/categoryTree";
import { useAuth } from "@/lib/auth";
import { emptyProduct, toPayload, type ProductValues } from "@/lib/productForm";
import { slugify, STORE_HOST } from "@/lib/seo";
import MarkdownEditor from "./MarkdownEditor";
import PhotoManager from "./PhotoManager";
import { SearchPreview, SeoChecklist } from "./SeoPanels";
import TagInput from "./TagInput";
import { ErrorText, Field } from "./form";

export { emptyProduct };
export type { ProductValues };

type Category = { _id: string; name: string; slug: string; parent?: string | null };

const card = "rounded-sm border border-line bg-white p-6";
const h2 = "font-display text-xl font-semibold";
const sub = "mt-1 mb-5 text-[13px] text-muted";
const control =
  "box-border w-full rounded-sm border border-[#C6C6CB] bg-white px-3.5 text-[15px] outline-none focus:border-accent";

// Quick ideas for the product details table.
const DETAIL_IDEAS = ["Material", "Weight", "Size", "Colour", "Capacity", "Warranty", "Power", "Made in"];

function Counter({ value, max, good }: { value: number; max: number; good?: [number, number] }) {
  const over = value > max;
  const ok = good ? value >= good[0] && value <= good[1] : !over;
  return (
    <span className={`text-[13px] font-normal ${over ? "text-[#B42318]" : ok && value > 0 ? "text-[#166534]" : "text-muted"}`}>
      {value}/{max}
    </span>
  );
}

const NEW_CATEGORY = "__new__";

type Props = {
  productId?: string;
  initial: ProductValues;
  // The product's current state when editing. A live product is saved with "Save changes", not "Publish".
  currentStatus?: "draft" | "pending" | "active" | "rejected";
};

export default function ProductForm({ productId, initial, currentStatus }: Props) {
  const { token, user } = useAuth();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isVendor = user?.role === "vendor";
  const base = isVendor ? "/vendor" : "/admin";

  const [v, setV] = useState<ProductValues>(initial);
  const [categories, setCategories] = useState<Category[] | null>(null);
  // Adding a category that is not in the list yet.
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  // Where the new category goes: the top level, or inside another one.
  const [newParent, setNewParent] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [needsReview, setNeedsReview] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"draft" | "active" | null>(null);
  const [uploading, setUploading] = useState(false);
  // Until the person edits the web address by hand, it follows the title.
  const [slugTouched, setSlugTouched] = useState(Boolean(productId));

  useEffect(() => {
    api<{ categories: Category[] }>("/categories")
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]));
    if (isVendor) {
      api<{ requireListingApproval: boolean }>("/settings")
        .then((s) => setNeedsReview(s.requireListingApproval))
        .catch(() => setNeedsReview(true));
    }
  }, [isVendor]);

  // Adds the category to the shared list (the whole store and every dashboard use it) and picks it.
  async function addCategory() {
    const name = newCategory.trim();
    if (name.length < 2) {
      setCategoryError("Enter the category name.");
      return;
    }
    setCategoryBusy(true);
    setCategoryError("");
    try {
      const { category } = await api<{ category: Category }>("/categories", { method: "POST", token, body: { name, parent: newParent || undefined } });
      setCategories((list) => (list?.some((c) => c._id === category._id) ? list : [...(list ?? []), category].sort((a, b) => a.name.localeCompare(b.name))));
      setV((p) => ({ ...p, category: category._id }));
      setAddingCategory(false);
      setNewCategory("");
      setNewParent("");
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Could not add the category");
    } finally {
      setCategoryBusy(false);
    }
  }

  const set = <K extends keyof ProductValues>(key: K, value: ProductValues[K]) => setV((p) => ({ ...p, [key]: value }));

  async function save(status: "draft" | "active") {
    if (!formRef.current?.reportValidity()) return;
    if (!v.category) {
      setError("Choose a category.");
      return;
    }
    if (status === "active" && v.images.length === 0) {
      setError("Add at least one photo before publishing.");
      return;
    }
    if (uploading) {
      setError("Please wait for the photos to finish uploading.");
      return;
    }
    setSaving(status);
    setError("");
    try {
      await api(productId ? `${base}/products/${productId}` : `${base}/products`, {
        method: productId ? "PUT" : "POST",
        token,
        body: toPayload(v, status),
      });
      router.push("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSaving(null);
    }
  }

  // Ctrl+S (or Cmd+S) saves a draft.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current("draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const live = currentStatus === "active";
  const publishLabel = live ? "Save changes" : isVendor && needsReview ? "Submit for review" : "Publish";
  const draftLabel = live ? "Unpublish (save as draft)" : "Save draft";

  return (
    <div>
      {/* Stays at the top while scrolling, so Save is always in reach. */}
      <div className="sticky top-0 z-20 -mx-6 -mt-8 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
        <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
          <Link href="/products" className="hover:text-foreground">
            Products
          </Link>{" "}
          / <span className="font-semibold text-foreground">{productId ? "Edit product" : "Add product"}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/products" className="inline-flex min-h-11 items-center rounded-sm border border-[#C6C6CB] bg-white px-4 text-sm font-semibold hover:border-foreground">
            Discard
          </Link>
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => save("draft")}
            title="Ctrl+S"
            className="min-h-11 cursor-pointer rounded-sm border border-foreground bg-white px-4 text-sm font-semibold hover:bg-surface disabled:opacity-60"
          >
            {saving === "draft" ? "Saving…" : draftLabel}
          </button>
          <button
            type="button"
            disabled={saving !== null || uploading}
            onClick={() => save("active")}
            className="min-h-11 cursor-pointer rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving === "active" ? "Saving…" : publishLabel}
          </button>
        </div>
      </div>

      <ErrorText message={error} />

      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---------------- Left: the product ---------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <section className={card}>
            <h2 className={h2}>Product information</h2>
            <p className={sub}>What the product is. This is what customers and Google read first.</p>
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between text-sm font-medium">
                  <span>
                    Product name <span className="text-[#B42318]">*</span>
                  </span>
                  <Counter value={v.title.length} max={150} />
                </span>
                <input
                  value={v.title}
                  required
                  minLength={3}
                  maxLength={150}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!slugTouched) set("slug", slugify(e.target.value));
                  }}
                  placeholder="e.g. HP 250 G5 Laptop, 8GB RAM, 500GB"
                  className={`${control} h-12`}
                />
                <span className="text-[13px] text-muted">Say what it is: brand, type and the key feature. Customers search with these words.</span>
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    Category <span className="text-[#B42318]">*</span>
                  </span>
                  <select
                    value={addingCategory ? NEW_CATEGORY : v.category}
                    onChange={(e) => {
                      if (e.target.value === NEW_CATEGORY) {
                        setAddingCategory(true);
                        setCategoryError("");
                      } else {
                        setAddingCategory(false);
                        set("category", e.target.value);
                      }
                    }}
                    required={!addingCategory}
                    className={`${control} h-12`}
                  >
                    <option value="" disabled>
                      {categories === null ? "Loading…" : "Choose a category"}
                    </option>
                    {categories &&
                      flatten(categories).map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.depth > 0 ? pathLabel(categories, c._id) : c.name}
                        </option>
                      ))}
                    {categories !== null && <option value={NEW_CATEGORY}>+ My category is not listed</option>}
                  </select>
                  {addingCategory && (
                    <span className="mt-1 flex flex-col gap-2 rounded-sm border border-line bg-[#F3F4F5] p-3">
                      <span className="flex gap-2">
                        <input
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCategory();
                            }
                          }}
                          maxLength={40}
                          placeholder="New category name"
                          aria-label="New category name"
                          className={`${control} h-11 min-w-0 flex-1`}
                        />
                        <button type="button" onClick={addCategory} disabled={categoryBusy} className="min-h-11 shrink-0 cursor-pointer rounded-sm bg-foreground px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                          {categoryBusy ? "Adding…" : "Add"}
                        </button>
                      </span>
                      <select
                        value={newParent}
                        onChange={(e) => setNewParent(e.target.value)}
                        aria-label="Goes inside"
                        className={`${control} h-11`}
                      >
                        <option value="">Top level (not inside another category)</option>
                        {categories &&
                          flatten(categories)
                            .filter((c) => c.depth < 2)
                            .map((c) => (
                              <option key={c._id} value={c._id}>
                                Inside: {c.depth > 0 ? pathLabel(categories, c._id) : c.name}
                              </option>
                            ))}
                      </select>
                      <span className="text-[13px] text-muted">It is added to the list for everyone on Square Market, so check first that it is not there already.</span>
                      {categoryError && <span role="alert" className="text-[13px] text-[#B42318]">{categoryError}</span>}
                    </span>
                  )}
                </label>
                <Field label="Brand" value={v.brand} onChange={(e) => set("brand", e.target.value)} maxLength={60} placeholder="e.g. HP, Hisense, Nike" />
              </div>

              <TagInput
                label="Tags"
                tags={v.tags}
                onChange={(t) => set("tags", t)}
                hint='Words people would search, like "washing machine" or "home appliances". Press Enter after each one.'
              />

              <MarkdownEditor
                label="Description"
                value={v.description}
                onChange={(d) => set("description", d)}
                hint="Use the buttons to add headings, bold text and lists. Good descriptions say what it is, who it is for and the main features."
              />
            </div>
          </section>

          <section className={card}>
            <h2 className={h2}>Photos</h2>
            <p className={sub}>Up to 8 photos. The first one is the main photo and the one Google shows.</p>
            <PhotoManager
              photos={v.images}
              onChange={(p) => set("images", p)}
              token={token}
              signPath={`${base}/uploads/sign`}
              title={v.title}
              onError={setError}
              onBusy={setUploading}
            />
          </section>

          <section className={card}>
            <h2 className={h2}>Product details</h2>
            <label className="mb-6 flex flex-col gap-1.5">
              <span className="text-sm font-medium">Key features</span>
              <textarea
                value={v.highlights}
                onChange={(e) => set("highlights", e.target.value)}
                rows={5}
                placeholder={"Lightweight and non-slip\nEasy to put on and take off\nThe fabric can be washed"}
                className={`${control} py-3`}
              />
              <span className="text-[13px] text-muted">The main selling points, one per line (up to 8). Shown as a bullet list next to the specifications.</span>
            </label>
            <p className={sub}>Specifications: facts shown in a table on the product page, such as material, weight or warranty. Google reads these too.</p>
            {v.details.length > 0 && (
              <div className="mb-4 flex flex-col gap-3">
                {v.details.map((d, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <input
                      aria-label="Detail name"
                      placeholder="e.g. Weight"
                      value={d.label}
                      maxLength={40}
                      onChange={(e) => set("details", v.details.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))}
                      className={`${control} h-11`}
                    />
                    <input
                      aria-label="Detail value"
                      placeholder="e.g. 340 g"
                      value={d.value}
                      maxLength={200}
                      onChange={(e) => set("details", v.details.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))}
                      className={`${control} h-11`}
                    />
                    <button
                      type="button"
                      onClick={() => set("details", v.details.filter((_, n) => n !== i))}
                      className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-[#B42318] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => set("details", [...v.details, { label: "", value: "" }])}
                className="min-h-11 cursor-pointer rounded-sm border border-dashed border-[#76777B] bg-[#F3F4F5] px-4 text-sm font-semibold hover:border-foreground"
              >
                + Add a detail
              </button>
              {DETAIL_IDEAS.filter((l) => !v.details.some((d) => d.label.toLowerCase() === l.toLowerCase()))
                .slice(0, 5)
                .map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => set("details", [...v.details, { label: l, value: "" }])}
                    className="min-h-9 cursor-pointer rounded-sm border border-line bg-white px-2.5 text-[13px] text-[#45474B] hover:border-foreground"
                  >
                    + {l}
                  </button>
                ))}
            </div>
          </section>

          <section className={card}>
            <h2 className={h2}>Options</h2>
            <p className={sub}>Only if the buyer must choose, like Size or Colour. Separate the choices with commas.</p>
            {v.variants.map((x, i) => (
              <div key={i} className="mb-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <input
                  aria-label="Option name"
                  placeholder="Size"
                  value={x.name}
                  onChange={(e) => set("variants", v.variants.map((y, n) => (n === i ? { ...y, name: e.target.value } : y)))}
                  className={`${control} h-11`}
                />
                <input
                  aria-label="Option values"
                  placeholder="S, M, L, XL"
                  value={x.options}
                  onChange={(e) => set("variants", v.variants.map((y, n) => (n === i ? { ...y, options: e.target.value } : y)))}
                  className={`${control} h-11`}
                />
                <button
                  type="button"
                  onClick={() => set("variants", v.variants.filter((_, n) => n !== i))}
                  className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-[#B42318] hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("variants", [...v.variants, { name: "", options: "" }])}
              className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-4 text-sm font-semibold hover:border-foreground"
            >
              + Add an option
            </button>
          </section>

          <section className={card}>
            <h2 className={h2}>Search listing (SEO)</h2>
            <p className={sub}>
              This controls how the product appears on Google. Leave the boxes empty and we write them from the name and description.
            </p>
            <div className="flex flex-col gap-5">
              <SearchPreview v={v} />

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Web address</span>
                <span className="flex min-w-0 items-stretch">
                  <span className="box-border inline-flex max-w-[55%] items-center truncate rounded-l-sm border border-r-0 border-[#C6C6CB] bg-[#F3F4F5] px-3 text-[13px] text-muted">
                    {STORE_HOST}/products/
                  </span>
                  <input
                    value={v.slug}
                    maxLength={80}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                    }}
                    onBlur={() => set("slug", slugify(v.slug))}
                    placeholder="hp-250-g5-laptop"
                    className={`${control} h-12 min-w-0 rounded-l-none`}
                  />
                </span>
                <span className="text-[13px] text-muted">
                  Short and made of words, like <em>hp-250-g5-laptop</em>.{" "}
                  {productId ? "If you change it, the old link keeps working and sends people to the new one." : "It follows the name until you change it."}
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between text-sm font-medium">
                  <span>Search title</span>
                  <Counter value={v.seoTitle.length} max={70} good={[30, 60]} />
                </span>
                <input
                  value={v.seoTitle}
                  maxLength={70}
                  onChange={(e) => set("seoTitle", e.target.value)}
                  placeholder={v.title ? `${v.title} | Square Market` : "Product name | Square Market"}
                  className={`${control} h-12`}
                />
                <span className="text-[13px] text-muted">The blue link on Google. Aim for 30 to 60 characters and include the website name, Square Market.</span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between text-sm font-medium">
                  <span>Search description</span>
                  <Counter value={v.seoDescription.length} max={180} good={[70, 160]} />
                </span>
                <textarea
                  value={v.seoDescription}
                  maxLength={180}
                  rows={3}
                  onChange={(e) => set("seoDescription", e.target.value)}
                  placeholder="A short summary that makes people want to click."
                  className={`${control} py-3`}
                />
                <span className="text-[13px] text-muted">The grey text under the link on Google. Aim for 70 to 160 characters.</span>
              </label>
            </div>
          </section>
        </div>

        {/* ---------------- Right: price, stock, checklist ---------------- */}
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-20">
          <section className={card}>
            <h2 className="mb-4 font-display text-base font-semibold">Price</h2>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  Price (₦) <span className="text-[#B42318]">*</span>
                </span>
                <span className="relative">
                  <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">₦</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={v.price}
                    onChange={(e) => set("price", e.target.value)}
                    className={`${control} h-12 pl-8 font-display text-lg font-bold`}
                  />
                </span>
              </label>
              <Field
                label="Old price (₦)"
                hint="Optional. Shown crossed out, with a discount tag."
                type="number"
                min={1}
                step={1}
                value={v.compareAtPrice}
                onChange={(e) => set("compareAtPrice", e.target.value)}
              />
            </div>
          </section>

          <section className={card}>
            <h2 className="mb-4 font-display text-base font-semibold">Stock and codes</h2>
            <div className="flex flex-col gap-4">
              <Field label="Stock" type="number" min={0} step={1} required value={v.stock} onChange={(e) => set("stock", e.target.value)} />
              <Field label="Product code (SKU)" hint="Your own code, if you use one." value={v.sku} maxLength={60} onChange={(e) => set("sku", e.target.value)} />
              <Field
                label="Barcode"
                hint="Optional. 8 to 14 digits. Helps Google recognise the exact product."
                inputMode="numeric"
                pattern="\d{8,14}|"
                title="8 to 14 digits"
                value={v.gtin}
                onChange={(e) => set("gtin", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </section>

          {isVendor && needsReview && (
            <p className="rounded-sm border border-line bg-white p-4 text-[13px] leading-relaxed text-[#45474B]">
              New products are checked by Square Market before they go live. Changing the name, description, category or photos of a live
              product sends it back for a quick check. Price and stock changes go live straight away.
            </p>
          )}

          <SeoChecklist v={v} />
        </aside>
      </form>
    </div>
  );
}
