"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { uploadImage, type UploadedImage } from "@/lib/upload";
import { ErrorText, Field, PrimaryButton, SelectField, TextArea } from "./form";

export type ProductValues = {
  title: string;
  description: string;
  category: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  status: "active" | "draft";
  images: UploadedImage[];
  variants: { name: string; options: string }[];
};

export const emptyProduct: ProductValues = {
  title: "",
  description: "",
  category: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  status: "active",
  images: [],
  variants: [],
};

type Category = { _id: string; name: string };

export default function ProductForm({ productId, initial }: { productId?: string; initial: ProductValues }) {
  const { token } = useAuth();
  const router = useRouter();
  const [v, setV] = useState<ProductValues>(initial);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api<{ categories: Category[] }>("/categories")
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]));
  }, []);

  const set = <K extends keyof ProductValues>(key: K, value: ProductValues[K]) => setV((p) => ({ ...p, [key]: value }));

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !token) return;
    if (v.images.length + files.length > 8) {
      setError("You can add up to 8 images.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of files) uploaded.push(await uploadImage(file, token));
      setV((p) => ({ ...p, images: [...p.images, ...uploaded] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const variants = v.variants
        .map((x) => ({
          name: x.name.trim(),
          options: x.options.split(",").map((o) => o.trim()).filter(Boolean),
        }))
        .filter((x) => x.name && x.options.length > 0);

      await api(productId ? `/admin/products/${productId}` : "/admin/products", {
        method: productId ? "PUT" : "POST",
        token,
        body: {
          title: v.title,
          description: v.description,
          category: v.category,
          price: Number(v.price),
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
          stock: Number(v.stock),
          status: v.status,
          images: v.images,
          variants,
        },
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      <ErrorText message={error} />

      <Field label="Title" value={v.title} onChange={(e) => set("title", e.target.value)} required minLength={3} />
      <TextArea
        label="Description"
        rows={6}
        value={v.description}
        onChange={(e) => set("description", e.target.value)}
        required
        minLength={10}
      />

      <SelectField label="Category" value={v.category} onChange={(e) => set("category", e.target.value)} required>
        <option value="" disabled>
          {categories === null ? "Loading…" : "Choose a category"}
        </option>
        {categories?.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      {categories?.length === 0 && (
        <p className="text-sm text-foreground/70">
          You have no categories yet.{" "}
          <Link href="/categories" className="text-accent underline">
            Add one first
          </Link>
          .
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Price (₦)"
          type="number"
          min={1}
          step={1}
          value={v.price}
          onChange={(e) => set("price", e.target.value)}
          required
        />
        <Field
          label="Old price (₦)"
          hint="Optional. Shown crossed out."
          type="number"
          min={1}
          step={1}
          value={v.compareAtPrice}
          onChange={(e) => set("compareAtPrice", e.target.value)}
        />
        <Field
          label="Stock"
          type="number"
          min={0}
          step={1}
          value={v.stock}
          onChange={(e) => set("stock", e.target.value)}
          required
        />
      </div>

      <section>
        <p className="mb-1 text-sm font-medium">Images (up to 8, the first is the main image)</p>
        <div className="mb-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {v.images.map((img, i) => (
            <div key={img.url} className="relative aspect-square border border-foreground/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`Product image ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-0 top-0 bg-foreground px-1 text-xs text-white">Main</span>}
              <button
                type="button"
                onClick={() => set("images", v.images.filter((_, n) => n !== i))}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-0 top-0 bg-white px-2 text-sm text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <label className="inline-block cursor-pointer border border-foreground/40 px-4 py-2 text-sm hover:border-accent">
          {uploading ? "Uploading…" : "Add images"}
          <input type="file" accept="image/*" multiple onChange={onFiles} disabled={uploading} className="sr-only" />
        </label>
      </section>

      <section>
        <p className="mb-1 text-sm font-medium">Options (optional, for example Size or Colour)</p>
        {v.variants.map((x, i) => (
          <div key={i} className="mb-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <input
              aria-label="Option name"
              placeholder="Size"
              value={x.name}
              onChange={(e) => set("variants", v.variants.map((y, n) => (n === i ? { ...y, name: e.target.value } : y)))}
              className="border border-foreground/30 px-3 py-3"
            />
            <input
              aria-label="Option values"
              placeholder="S, M, L, XL"
              value={x.options}
              onChange={(e) => set("variants", v.variants.map((y, n) => (n === i ? { ...y, options: e.target.value } : y)))}
              className="border border-foreground/30 px-3 py-3"
            />
            <button
              type="button"
              onClick={() => set("variants", v.variants.filter((_, n) => n !== i))}
              className="px-2 text-red-800 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("variants", [...v.variants, { name: "", options: "" }])}
          className="border border-foreground/40 px-4 py-2 text-sm hover:border-accent"
        >
          Add an option
        </button>
      </section>

      <SelectField label="Status" value={v.status} onChange={(e) => set("status", e.target.value as "active" | "draft")}>
        <option value="active">Live on the website</option>
        <option value="draft">Draft (hidden)</option>
      </SelectField>

      <div className="flex gap-3">
        <PrimaryButton type="submit" busy={busy} disabled={uploading}>
          {productId ? "Save changes" : "Add product"}
        </PrimaryButton>
        <Link href="/" className="border border-foreground/40 px-5 py-3 hover:border-accent">
          Cancel
        </Link>
      </div>
    </form>
  );
}
