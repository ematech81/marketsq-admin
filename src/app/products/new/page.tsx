"use client";

import ProductForm, { emptyProduct } from "@/components/ProductForm";
import Shell from "@/components/Shell";

export default function NewProductPage() {
  return (
    <Shell>
      <ProductForm initial={emptyProduct} />
    </Shell>
  );
}
