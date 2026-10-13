export const SITE_NAME = "Square Market";

const STORE_URL = (process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const STORE_HOST = STORE_URL.replace(/^https?:\/\//, "");
export const STORE_BASE = STORE_URL;

// Markdown to plain text, for the search-result preview and the description checks.
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/(\*\*|__|\*|_)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : cut.length).trim()}…`;
}

// A readable web address from a title: "Hisense 7kg Washing Machine" becomes "hisense-7kg-washing-machine".
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// What Google will show for a product, given what has been typed so far.
export function searchPreview(v: { title: string; seoTitle: string; seoDescription: string; description: string; slug: string }) {
  const title = v.seoTitle.trim() || `${v.title.trim() || "Product name"} | ${SITE_NAME}`;
  const description = v.seoDescription.trim() || excerpt(plainText(v.description), 155) || "Your product description will appear here.";
  return { title, description, url: `${STORE_HOST} › products › ${v.slug || slugify(v.title) || "product-name"}` };
}
