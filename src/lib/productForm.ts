// The shape of the product entry form, and how it converts to and from what the API stores.

export type Photo = { url: string; publicId: string; alt: string };

export type ProductValues = {
  title: string;
  description: string;
  category: string;
  brand: string;
  tags: string[];
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  gtin: string;
  images: Photo[];
  // One key feature per line.
  highlights: string;
  details: { label: string; value: string }[];
  variants: { name: string; options: string }[];
  seoTitle: string;
  seoDescription: string;
  slug: string;
};

export const emptyProduct: ProductValues = {
  title: "",
  description: "",
  category: "",
  brand: "",
  tags: [],
  price: "",
  compareAtPrice: "",
  stock: "0",
  sku: "",
  gtin: "",
  images: [],
  highlights: "",
  details: [],
  variants: [],
  seoTitle: "",
  seoDescription: "",
  slug: "",
};

// What the API sends back for a product (category is an id string when editing).
export type ApiProduct = {
  title: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
  price: number;
  compareAtPrice?: number;
  stock: number;
  sku?: string;
  gtin?: string;
  status: "draft" | "pending" | "active" | "rejected";
  images: { url: string; publicId?: string; alt?: string }[];
  highlights?: string[];
  details?: { label: string; value: string }[];
  variants: { name: string; options: string[] }[];
  seoTitle?: string;
  seoDescription?: string;
  slug: string;
};

export function fromApi(p: ApiProduct): ProductValues {
  return {
    title: p.title,
    description: p.description,
    category: String(p.category),
    brand: p.brand ?? "",
    tags: p.tags ?? [],
    price: String(p.price),
    compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
    stock: String(p.stock),
    sku: p.sku ?? "",
    gtin: p.gtin ?? "",
    images: p.images.map((i) => ({ url: i.url, publicId: i.publicId ?? "", alt: i.alt ?? "" })),
    highlights: (p.highlights ?? []).join("\n"),
    details: (p.details ?? []).map((d) => ({ label: d.label, value: d.value })),
    variants: p.variants.map((x) => ({ name: x.name, options: x.options.join(", ") })),
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    slug: p.slug,
  };
}

export function toPayload(v: ProductValues, status: "active" | "draft") {
  const variants = v.variants
    .map((x) => ({ name: x.name.trim(), options: x.options.split(",").map((o) => o.trim()).filter(Boolean) }))
    .filter((x) => x.name && x.options.length > 0);

  return {
    title: v.title.trim(),
    description: v.description.trim(),
    category: v.category,
    brand: v.brand.trim(),
    tags: v.tags,
    price: Number(v.price),
    compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
    stock: Number(v.stock),
    sku: v.sku.trim(),
    gtin: v.gtin.trim(),
    status,
    images: v.images.map((i) => ({ url: i.url, publicId: i.publicId || undefined, alt: i.alt.trim() })),
    highlights: v.highlights.split("\n").map((l) => l.trim()).filter(Boolean),
    details: v.details.map((d) => ({ label: d.label.trim(), value: d.value.trim() })).filter((d) => d.label && d.value),
    variants,
    seoTitle: v.seoTitle.trim(),
    seoDescription: v.seoDescription.trim(),
    slug: v.slug.trim(),
  };
}
