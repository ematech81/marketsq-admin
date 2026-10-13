"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProductForm from "@/components/ProductForm";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fromApi, type ApiProduct, type ProductValues } from "@/lib/productForm";

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
  const [loaded, setLoaded] = useState<{ values: ProductValues; status: ApiProduct["status"] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ product: ApiProduct }>(`${base}/products/${id}`, { token })
      .then(({ product }) => setLoaded({ values: fromApi(product), status: product.status }))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the product"));
  }, [id, token, base]);

  if (!loaded) return error ? <ErrorText message={error} /> : <p className="text-muted">Loading…</p>;
  return <ProductForm productId={id} initial={loaded.values} currentStatus={loaded.status} />;
}
