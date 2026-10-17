"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText, Field, PrimaryButton } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { flatten, type TreeCategory } from "@/lib/categoryTree";

type Category = TreeCategory;

const control = "box-border h-11 rounded-sm border border-[#C6C6CB] bg-white px-3 text-[15px] outline-none focus:border-accent";

export default function CategoriesPage() {
  return (
    <Shell adminOnly>
      <Categories />
    </Shell>
  );
}

function Categories() {
  const { token } = useAuth();
  const [items, setItems] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParent, setEditParent] = useState("");
  // Where a new category goes: the top level, or inside another category.
  const [newParent, setNewParent] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<{ categories: Category[] }>("/categories");
      setItems(res.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories");
    }
  }, []);

  useEffect(() => {
    // Deferred one tick so the fetch result is never set during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const rows = useMemo(() => flatten(items ?? []), [items]);
  const nameOf = (id: string | null | undefined) => rows.find((r) => r._id === id)?.name;

  // Everything inside a category (so it cannot be moved into itself).
  function inside(id: string): Set<string> {
    const out = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of items ?? []) {
        if (c.parent && out.has(c.parent) && !out.has(c._id)) {
          out.add(c._id);
          grew = true;
        }
      }
    }
    return out;
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name")).trim();
    setBusy(true);
    setError("");
    try {
      await api("/admin/categories", { method: "POST", token, body: { name, parent: newParent || null } });
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the category");
    } finally {
      setBusy(false);
    }
  }

  async function save(id: string) {
    setError("");
    try {
      await api(`/admin/categories/${id}`, { method: "PUT", token, body: { name: editName.trim(), parent: editParent || null } });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the category");
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(`Delete the category "${c.name}"?`)) return;
    setError("");
    try {
      await api(`/admin/categories/${c._id}`, { method: "DELETE", token });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the category");
    }
  }

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Categories</h1>
      <p className="mb-6 max-w-xl text-sm text-[#45474B]">
        A category can have sub-categories inside it, up to three levels: for example Fashion, then Men&apos;s fashion, then Men&apos;s shoes. Customers who
        open Fashion also see everything inside it. Give a sub-category a full name, like &ldquo;Men&apos;s shoes&rdquo;, so it makes sense wherever it shows.
      </p>

      <form onSubmit={add} className="mb-6 flex max-w-2xl flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label="New category" name="name" placeholder="Fashion, Men's shoes…" required minLength={2} />
        </div>
        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">Goes inside</span>
          <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className={`${control} h-12`}>
            <option value="">Nothing (top level)</option>
            {rows.map((r) => (
              <option key={r._id} value={r._id} disabled={r.depth >= 2}>
                {"  ".repeat(r.depth)}
                {r.name}
                {r.depth >= 2 ? " (too deep)" : ""}
              </option>
            ))}
          </select>
        </label>
        <PrimaryButton type="submit" busy={busy}>
          Add
        </PrimaryButton>
      </form>

      <div className="max-w-2xl">
        <ErrorText message={error} />
      </div>

      {items === null ? (
        <p className="text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">No categories yet. Add your first one above.</p>
      ) : (
        <ul className="max-w-2xl border border-line bg-white">
          {rows.map((c) => (
            <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3 last:border-0" style={{ paddingLeft: 12 + c.depth * 24 }}>
              {editing === c._id ? (
                <>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Category name"
                      className={`${control} min-w-40 flex-1`}
                    />
                    <select value={editParent} onChange={(e) => setEditParent(e.target.value)} aria-label="Goes inside" className={`${control} min-w-40 flex-1`}>
                      <option value="">Nothing (top level)</option>
                      {rows
                        .filter((r) => !inside(c._id).has(r._id))
                        .map((r) => (
                          <option key={r._id} value={r._id}>
                            {"  ".repeat(r.depth)}
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <span className="text-sm">
                    <button onClick={() => save(c._id)} className="mr-4 cursor-pointer font-semibold text-accent-ink hover:underline">
                      Save
                    </button>
                    <button onClick={() => setEditing(null)} className="cursor-pointer hover:underline">
                      Cancel
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium">
                    {c.depth > 0 && <span className="mr-1.5 text-muted">↳</span>}
                    {c.name}
                  </span>
                  <span className="text-sm">
                    {c.depth < 2 && (
                      <button
                        onClick={() => {
                          setNewParent(c._id);
                          document.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="mr-4 cursor-pointer text-accent-ink hover:underline"
                      >
                        Add inside
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditing(c._id);
                        setEditName(c.name);
                        setEditParent(c.parent ?? "");
                      }}
                      className="mr-4 cursor-pointer hover:text-accent"
                    >
                      Edit
                    </button>
                    <button onClick={() => remove(c)} className="cursor-pointer text-red-800 hover:underline">
                      Delete
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {newParent && (
        <p className="mt-3 max-w-2xl text-sm text-[#45474B]">
          The next category you add goes inside <strong>{nameOf(newParent)}</strong>.
        </p>
      )}
    </>
  );
}
