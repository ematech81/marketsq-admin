"use client";

import ProductForm, { emptyProduct } from "@/components/ProductForm";
import Shell from "@/components/Shell";

export default function NewProductPage() {
  return (
    <Shell>
      <h1 className="mb-6 text-3xl font-bold">Add product</h1>
      <ProductForm initial={emptyProduct} />
    </Shell>
  );
}
