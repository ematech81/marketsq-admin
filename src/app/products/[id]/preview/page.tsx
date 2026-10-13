"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import RichText from "@/components/RichText";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Product = {
  _id: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  status: "draft" | "pending" | "active" | "rejected";
  rejectionReason?: string;
  images: { url: string; alt?: string }[];
  brand?: string;
  sku?: string;
  tags?: string[];
  details?: { label: string; value: string }[];
  seoTitle?: string;
  seoDescription?: string;
  slug: string;
  variants: { name: string; options: string[] }[];
  category?: { name: string };
  vendor?: { businessName: string; category: string; state: string; city: string } | null;
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const STATUS: Record<Product["status"], { label: string; cls: string }> = {
  active: { label: "Live on the store", cls: "bg-[#DCFCE7] text-[#14532D]" },
  draft: { label: "Draft (hidden)", cls: "bg-surface text-foreground" },
  pending: { label: "Waiting for your review", cls: "bg-[#FBEAE4] text-[#8A3219]" },
  rejected: { label: "Sent back to the vendor", cls: "bg-[#FEF3F2] text-[#B42318]" },
};

export default function PreviewPage() {
  return (
    <Shell adminOnly>
      <Preview />
    </Shell>
  );
}

// Shows a product the way a customer will see it, so the admin can judge it before it goes live.
function Preview() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setProduct((await api<{ product: Product }>(`/admin/products/${id}/preview`, { token })).product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this product");
    }
  }, [id, token]);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function review(decision: "approve" | "reject") {
    if (!product) return;
    let reason: string | undefined;
    if (decision === "reject") {
      const answer = window.prompt(`What should ${product.vendor?.businessName ?? "the vendor"} fix on "${product.title}"? They will see this.`);
      if (!answer || !answer.trim()) return;
      reason = answer.trim();
    }
    setBusy(true);
    setError("");
    try {
      await api(`/admin/products/${product._id}/review`, { method: "PATCH", token, body: { decision, reason } });
      router.push("/products?status=pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the decision");
      setBusy(false);
    }
  }

  if (!product) return error ? <ErrorText message={error} /> : <p className="text-muted">Loading…</p>;

  const status = STATUS[product.status];
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;
  const waiting = product.status === "pending" && product.vendor;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>{" "}
        / <span className="text-foreground">Preview</span>
      </nav>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-line bg-white p-5">
        <div className="flex flex-col gap-1.5">
          <span className={`self-start rounded-sm px-2.5 py-1 text-[13px] font-semibold ${status.cls}`}>{status.label}</span>
          <span className="text-sm text-[#45474B]">
            {product.vendor ? `Listed by ${product.vendor.businessName} (${product.vendor.city}, ${product.vendor.state})` : "Your own product"}
          </span>
          {product.status === "rejected" && product.rejectionReason && (
            <span className="text-sm text-[#B42318]">Reason given: {product.rejectionReason}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {waiting && (
            <>
              <button type="button" disabled={busy} onClick={() => review("approve")} className="min-h-11 cursor-pointer rounded-sm bg-accent px-5 text-sm font-semibold text-foreground hover:opacity-90 disabled:opacity-60">
                Approve and publish
              </button>
              <button type="button" disabled={busy} onClick={() => review("reject")} className="min-h-11 cursor-pointer rounded-sm border border-[#C6C6CB] bg-white px-5 text-sm font-semibold text-[#B42318] disabled:opacity-60">
                Reject
              </button>
            </>
          )}
          <Link href={`/products/${product._id}`} className="inline-flex min-h-11 items-center rounded-sm border border-[#C6C6CB] bg-white px-5 text-sm font-semibold hover:border-foreground">
            Edit
          </Link>
        </div>
      </section>

      <ErrorText message={error} />

      <p className="text-[13px] text-muted">This is how the product will look to customers.</p>

      <div className="flex flex-wrap items-start gap-10">
        <section className="flex min-w-0 flex-1 basis-105 flex-col gap-3">
          <div className="relative flex aspect-square items-center justify-center rounded-sm border border-line bg-surface">
            {product.images[active] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[active].url} alt={product.images[active].alt || product.title} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm text-muted">No image</span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={`aspect-square cursor-pointer rounded-sm bg-surface p-0 ${i === active ? "border-2 border-accent" : "border border-line"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-1 basis-96 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-accent-ink">Sold by {product.vendor?.businessName ?? "Square Market"}</span>
            <h1 className="text-[32px] leading-[1.15] font-bold tracking-[-0.02em]">{product.title}</h1>
            <span className="text-sm text-muted">
              {product.category?.name}
              {product.brand ? ` · ${product.brand}` : ""}
              {product.sku ? ` · Code ${product.sku}` : ""}
            </span>
          </div>

          <p className="flex flex-wrap items-baseline gap-3">
            <span className="font-display text-[32px] font-bold">{naira.format(product.price)}</span>
            {product.compareAtPrice && <span className="text-lg text-muted line-through">{naira.format(product.compareAtPrice)}</span>}
            {discount > 0 && <span className="bg-accent px-2 py-1 text-xs font-semibold text-foreground">-{discount}%</span>}
          </p>

          <p className={`text-sm font-semibold ${product.stock > 0 ? "text-[#166534]" : "text-[#B42318]"}`}>
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          {product.variants.map((v) => (
            <div key={v.name}>
              <p className="mb-2 text-sm font-semibold capitalize">{v.name}</p>
              <div className="flex flex-wrap gap-2">
                {v.options.map((o) => (
                  <span key={o} className="inline-flex min-h-11 items-center rounded-sm border border-[#C6C6CB] bg-white px-5 text-sm font-medium">
                    {o}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-line pt-4">
            <h2 className="mb-2 font-display text-lg font-semibold">Description</h2>
            <RichText>{product.description}</RichText>
          </div>

          {product.details && product.details.length > 0 && (
            <div className="border-t border-line pt-4">
              <h2 className="mb-2 font-display text-lg font-semibold">Product details</h2>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {product.details.map((d) => (
                    <tr key={d.label} className="border-b border-line last:border-0">
                      <th scope="row" className="w-2/5 py-2 pr-3 text-left font-normal text-muted">{d.label}</th>
                      <td className="py-2">{d.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span key={t} className="rounded-sm border border-line bg-white px-2.5 py-1 text-[13px] text-[#45474B]">{t}</span>
              ))}
            </div>
          )}

          <div className="rounded-sm border border-line bg-white p-4 text-[13px] text-[#45474B]">
            <p className="mb-1 font-semibold text-foreground">How it will appear on Google</p>
            <p>Title: {product.seoTitle || `${product.title} | Square Market`}</p>
            <p>Address: /products/{product.slug}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
