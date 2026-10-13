"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/lib/upload";
import type { Photo } from "@/lib/productForm";

type Props = {
  photos: Photo[];
  onChange: (next: Photo[]) => void;
  token: string | null;
  signPath: string;
  // The product title: photo file names start with it, and it is the suggested photo description.
  title: string;
  onError: (message: string) => void;
  onBusy?: (busy: boolean) => void;
  max?: number;
};

// Upload, order and describe the product photos. The first photo is the main one (the one Google shows).
export default function PhotoManager({ photos, onChange, token, signPath, title, onError, onBusy, max = 8 }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  async function add(files: File[]) {
    if (files.length === 0 || !token) return;
    if (photos.length + files.length > max) {
      onError(`You can add up to ${max} photos.`);
      return;
    }
    onError("");
    onBusy?.(true);
    const uploaded: Photo[] = [];
    try {
      for (const [i, file] of files.entries()) {
        setBusy({ done: i, total: files.length });
        const res = await uploadImage(file, token, signPath, title.trim() || undefined);
        // Start with the product name as the photo description. The person can make it more specific.
        uploaded.push({ url: res.url, publicId: res.publicId, alt: title.trim() });
      }
      onChange([...photos, ...uploaded]);
    } catch (err) {
      // Keep the photos that did upload before the problem.
      if (uploaded.length > 0) onChange([...photos, ...uploaded]);
      onError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setBusy(null);
      onBusy?.(false);
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const setAlt = (i: number, alt: string) => onChange(photos.map((p, n) => (n === i ? { ...p, alt } : p)));
  const smallBtn =
    "flex size-8 cursor-pointer items-center justify-center rounded-sm border border-[#C6C6CB] bg-white text-sm hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(Array.from(e.dataTransfer.files));
        }}
        className={`mb-5 rounded-sm border-2 border-dashed p-6 text-center ${dragging ? "border-accent bg-[#FBEAE4]" : "border-[#C6C6CB] bg-[#F3F4F5]"}`}
      >
        <p className="mb-1 text-[15px] font-semibold">{busy ? `Uploading ${busy.done + 1} of ${busy.total}…` : "Drag and drop photos here"}</p>
        <p className="mb-3 text-[13px] text-muted">
          JPG, PNG or WebP, up to 10 MB each. A clear photo on a plain, light background looks best. {photos.length} of {max} added.
        </p>
        <button
          type="button"
          disabled={busy !== null || photos.length >= max}
          onClick={() => fileInput.current?.click()}
          className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-5 text-sm font-semibold hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose photos
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            add(files);
          }}
        />
      </div>

      {photos.length > 0 && (
        <>
          <p className="mb-3 text-[13px] text-muted">
            <strong className="text-foreground">Describe each photo</strong> in a few words, like &quot;Black HP laptop, front view&quot;. Google uses this text to
            understand the picture, and it is read aloud to people who cannot see it. The first photo is the main one.
          </p>
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
            {photos.map((p, i) => (
              <li key={p.url} className="flex flex-col gap-2 rounded-sm border border-line bg-[#F8F9FA] p-2.5">
                <div className="relative aspect-square border border-line bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.alt || title || `Photo ${i + 1}`} className="h-full w-full object-contain" />
                  {i === 0 && <span className="absolute top-2 left-2 bg-foreground px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">MAIN</span>}
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium">Photo description</span>
                  <input
                    value={p.alt}
                    maxLength={125}
                    onChange={(e) => setAlt(i, e.target.value)}
                    placeholder={title ? `e.g. ${title}, side view` : "What is in this photo?"}
                    className="box-border h-10 w-full rounded-sm border border-[#C6C6CB] bg-white px-2.5 text-sm outline-none focus:border-accent"
                  />
                </label>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className={smallBtn}>
                      ←
                    </button>
                    <button type="button" onClick={() => move(i, i + 1)} disabled={i === photos.length - 1} aria-label={`Move photo ${i + 1} later`} className={smallBtn}>
                      →
                    </button>
                  </div>
                  <button type="button" onClick={() => onChange(photos.filter((_, n) => n !== i))} className="min-h-8 cursor-pointer px-2 text-[13px] font-semibold text-[#B42318] hover:underline">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
