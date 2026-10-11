"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProductForm, { type ProductValues } from "@/components/ProductForm";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ApiProduct = {
  title: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  status: "draft" | "pending" | "active" | "rejected";
  images: { url: string; publicId?: string }[];
  variants: { name: string; options: string[] }[];
};

export default function EditProductPage() {
  return (
    <Shell>
      <Editor />
    </Shell>
  );
}

function Editor() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const base = user?.role === "vendor" ? "/vendor" : "/admin";
  const [initial, setInitial] = useState<ProductValues | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ product: ApiProduct }>(`${base}/products/${id}`, { token })
      .then(({ product: p }) =>
        setInitial({
          title: p.title,
          description: p.description,
          category: String(p.category),
          price: String(p.price),
          compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
          stock: String(p.stock),
          status: p.status === "draft" ? "draft" : "active",
          images: p.images.map((i) => ({ url: i.url, publicId: i.publicId ?? "" })),
          variants: p.variants.map((x) => ({ name: x.name, options: x.options.join(", ") })),
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the product"));
  }, [id, token, base]);

  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Edit product</h1>
      <ErrorText message={error} />
      {initial ? <ProductForm productId={id} initial={initial} /> : !error && <p className="text-muted">Loading…</p>}
    </>
  );
}
