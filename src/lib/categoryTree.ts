// Categories form a tree: Fashion > Men's fashion > Men's shoes. The API sends them as one flat list, each knowing its
// parent. These helpers turn that list into what menus and pages need.

export type TreeCategory = { _id: string; name: string; slug: string; parent?: string | null };

// The categories at the top: Fashion, Electronics...
export const topLevel = <T extends TreeCategory>(all: T[]): T[] => all.filter((c) => !c.parent);

// The categories directly inside one category (or at the top, when `parent` is null).
export const childrenOf = <T extends TreeCategory>(all: T[], parent: string | null): T[] =>
  all.filter((c) => (c.parent ?? null) === parent);

// Every category in tree order (a parent, then what is inside it), each with how deep it is.
export function flatten<T extends TreeCategory>(all: T[]): (T & { depth: number })[] {
  const out: (T & { depth: number })[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of childrenOf(all, parent)) {
      out.push({ ...c, depth });
      walk(c._id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

// From the top down: [Fashion, Men's fashion, Men's shoes].
export function pathOf<T extends TreeCategory>(all: T[], id: string): T[] {
  const byId = new Map(all.map((c) => [c._id, c]));
  const path: T[] = [];
  const seen = new Set<string>();
  let cur = byId.get(id);
  while (cur && !seen.has(cur._id)) {
    seen.add(cur._id);
    path.unshift(cur);
    cur = cur.parent ? byId.get(cur.parent) : undefined;
  }
  return path;
}

// "Fashion › Men's fashion › Men's shoes", for a dropdown where the place in the tree matters.
export const pathLabel = <T extends TreeCategory>(all: T[], id: string) => pathOf(all, id).map((c) => c.name).join(" › ");
