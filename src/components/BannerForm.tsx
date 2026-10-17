"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { topLevel } from "@/lib/categoryTree";
import { useAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/upload";
import { ErrorText } from "./form";

type Img = { url: string; publicId?: string; width?: number; height?: number } | null;
type Category = { _id: string; name: string; slug: string; parent?: string | null };

export type BannerValues = {
  title: string;
  image: Img;
  mobileImage: Img;
  alt: string;
  link: string;
  active: boolean;
};

export const emptyBanner: BannerValues = { title: "", image: null, mobileImage: null, alt: "", link: "", active: true };

const control = "box-border w-full rounded-sm border border-[#C6C6CB] bg-white px-3.5 text-[15px] outline-none focus:border-accent";
const card = "rounded-sm border border-line bg-white p-6";
const h2 = "font-display text-xl font-semibold";
const sub = "mt-1 mb-4 text-[13px] text-muted";

// Reads a picture's size in the browser, before it is uploaded.
function readSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as a picture."));
    };
    img.src = url;
  });
}

type SlotProps = {
  label: string;
  required?: boolean;
  hint: string;
  value: Img;
  onChange: (v: Img) => void;
  upload: (file: File) => Promise<{ url: string; publicId: string; width?: number; height?: number }>;
  // The shape this picture is shown in, and what to warn about.
  ratio: number;
  ratioLabel: string;
  minWidth: number;
  onError: (m: string) => void;
};

// One picture to upload: a drop area, a preview, and advice about its size.
function ImageSlot({ label, required, hint, value, onChange, upload, ratio, ratioLabel, minWidth, onError }: SlotProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [advice, setAdvice] = useState("");

  async function take(file: File | undefined) {
    if (!file) return;
    onError("");
    setAdvice("");
    setBusy(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not a picture.`);
      const { w, h } = await readSize(file);
      const notes: string[] = [];
      if (w < minWidth) notes.push(`It is only ${w} pixels wide, so it may look blurry. Aim for at least ${minWidth}.`);
      if (Math.abs(w / h - ratio) / ratio > 0.25) notes.push(`It is ${w}×${h}. This spot is ${ratioLabel}, so the edges may be cropped.`);
      const res = await upload(file);
      onChange({ url: res.url, publicId: res.publicId, width: res.width ?? w, height: res.height ?? h });
      setAdvice(notes.join(" "));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">
        {label} {required && <span className="text-[#B42318]">*</span>}
      </p>
      {value ? (
        <div className="mb-2 border border-line bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt="Banner preview" className="block w-full object-cover" style={{ aspectRatio: String(ratio) }} />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            take(e.dataTransfer.files[0]);
          }}
          className={`mb-2 flex min-h-28 flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed p-5 text-center ${dragging ? "border-accent bg-[#FBEAE4]" : "border-[#C6C6CB] bg-[#F3F4F5]"}`}
        >
          <p className="text-[15px] font-semibold">{busy ? "Uploading…" : "Drag your design here"}</p>
          <p className="text-[13px] text-muted">{hint}</p>
        </div>
      )}
      {advice && <p className="mb-2 rounded-sm border border-[#E8C547] bg-[#FFF8DB] p-2.5 text-[13px] text-[#5C4A00]">{advice}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-4 text-sm font-semibold hover:border-foreground disabled:opacity-50"
        >
          {value ? "Replace picture" : "Choose a picture"}
        </button>
        {value && !required && (
          <button type="button" onClick={() => onChange(null)} className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-[#B42318] hover:underline">
            Remove
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          take(f);
        }}
      />
    </div>
  );
}

// Add or change a home page banner.
export default function BannerForm({ bannerId, initial }: { bannerId?: string; initial: BannerValues }) {
  const { token } = useAuth();
  const router = useRouter();
  const [v, setV] = useState<BannerValues>(initial);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ categories: Category[] }>("/categories")
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]));
  }, []);

  const set = <K extends keyof BannerValues>(k: K, value: BannerValues[K]) => setV((p) => ({ ...p, [k]: value }));
  const upload = (file: File) => uploadImage(file, token ?? "", "/admin/banners-upload-sign", v.title || "banner");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!v.image) {
      setError("Add the banner picture.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(bannerId ? `/admin/banners/${bannerId}` : "/admin/banners", {
        method: bannerId ? "PUT" : "POST",
        token,
        body: {
          title: v.title.trim(),
          image: v.image,
          mobileImage: v.mobileImage ?? undefined,
          alt: v.alt.trim(),
          link: v.link.trim(),
          active: v.active,
        },
      });
      router.push("/banners");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the banner");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex max-w-3xl flex-col gap-6">
      <ErrorText message={error} />

      <section className={card}>
        <h2 className={h2}>The design</h2>
        <p className={sub}>Upload the finished flyer, for example from Canva. It fills the full width of the page at the top of the home page.</p>
        <div className="flex flex-col gap-6">
          <ImageSlot
            label="Banner picture"
            required
            hint="Best: 1920 × 480 pixels (very wide, 4 to 1). Use the same size for every banner. JPG or PNG up to 10 MB."
            value={v.image}
            onChange={(i) => set("image", i)}
            upload={upload}
            ratio={4}
            ratioLabel="very wide (about 4 to 1)"
            minWidth={1600}
            onError={setError}
          />
          <ImageSlot
            label="Phone picture (optional)"
            hint="Best: 800 × 600 pixels (a taller shape). Phones show this instead of the wide one."
            value={v.mobileImage}
            onChange={(i) => set("mobileImage", i)}
            upload={upload}
            ratio={4 / 3}
            ratioLabel="a taller 4 to 3 shape"
            minWidth={600}
            onError={setError}
          />
          <p className="text-[13px] text-muted">
            Without a phone picture, phones show the wide design, smaller. Keep text and faces away from the very edges, because narrow screens crop the sides.
          </p>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>Details</h2>
        <p className={sub}>These help customers who cannot see the picture, and Google.</p>
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Name <span className="text-[#B42318]">*</span>
            </span>
            <input value={v.title} onChange={(e) => set("title", e.target.value)} required minLength={2} maxLength={80} placeholder="e.g. October Nivea promo" className={`${control} h-12`} />
            <span className="text-[13px] text-muted">Only you see this name. It helps you find the banner in your list.</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between text-sm font-medium">
              <span>
                What does the banner say? <span className="text-[#B42318]">*</span>
              </span>
              <span className="text-[13px] font-normal text-muted">{v.alt.length}/125</span>
            </span>
            <input value={v.alt} onChange={(e) => set("alt", e.target.value)} required minLength={3} maxLength={125} placeholder="e.g. Nivea body care, up to 40% off" className={`${control} h-12`} />
            <span className="text-[13px] text-muted">Write the main words on the picture. It is read aloud to people who cannot see it.</span>
          </label>

          <div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Where should a click go? (optional)</span>
              <input value={v.link} onChange={(e) => set("link", e.target.value)} maxLength={500} placeholder="/products?category=fashion" className={`${control} h-12`} />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted">Quick pick:</span>
              <button type="button" onClick={() => set("link", "/products")} className="min-h-9 cursor-pointer rounded-sm border border-line bg-white px-2.5 text-[13px] hover:border-foreground">
                All products
              </button>
              {topLevel(categories).map((c) => (
                <button key={c._id} type="button" onClick={() => set("link", `/products?category=${c.slug}`)} className="min-h-9 cursor-pointer rounded-sm border border-line bg-white px-2.5 text-[13px] hover:border-foreground">
                  {c.name}
                </button>
              ))}
              {v.link && (
                <button type="button" onClick={() => set("link", "")} className="min-h-9 cursor-pointer px-2 text-[13px] font-semibold text-[#B42318] hover:underline">
                  No link
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[13px] text-muted">
              A page on the store (starting with /, like /products/hisense-washing-machine) or a full address starting with https://. Leave empty if the banner is just a picture.
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} className="mt-0.5 size-[18px] accent-accent" />
            <span>
              <span className="font-medium">Show this banner on the home page</span>
              <span className="block text-[13px] text-muted">Untick to keep it saved but hidden.</span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="min-h-11 cursor-pointer rounded-sm bg-accent px-6 text-sm font-semibold text-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? "Saving…" : bannerId ? "Save changes" : "Add banner"}
        </button>
        <Link href="/banners" className="inline-flex min-h-11 items-center rounded-sm border border-[#C6C6CB] bg-white px-5 text-sm font-semibold hover:border-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}
