"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { ErrorText, Field, PrimaryButton } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Category = { _id: string; name: string; slug: string };

export default function CategoriesPage() {
  return (
    <Shell>
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

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name")).trim();
    setBusy(true);
    setError("");
    try {
      await api("/admin/categories", { method: "POST", token, body: { name } });
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the category");
    } finally {
      setBusy(false);
    }
  }

  async function rename(id: string) {
    setError("");
    try {
      await api(`/admin/categories/${id}`, { method: "PUT", token, body: { name: editName.trim() } });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename the category");
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
      <h1 className="mb-6 text-3xl font-bold">Categories</h1>

      <form onSubmit={add} className="mb-6 flex max-w-md items-end gap-3">
        <div className="flex-1">
          <Field label="New category" name="name" placeholder="Fashion, Electronics…" required minLength={2} />
        </div>
        <PrimaryButton type="submit" busy={busy}>
          Add
        </PrimaryButton>
      </form>

      <div className="max-w-md">
        <ErrorText message={error} />
      </div>

      {items === null ? (
        <p className="text-foreground/60">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-foreground/70">No categories yet. Add your first one above.</p>
      ) : (
        <ul className="max-w-md border border-foreground/15">
          {items.map((c) => (
            <li key={c._id} className="flex items-center justify-between gap-3 border-b border-foreground/10 p-3 last:border-0">
              {editing === c._id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Category name"
                    className="flex-1 border border-foreground/30 px-2 py-1"
                  />
                  <button onClick={() => rename(c._id)} className="text-accent hover:underline">
                    Save
                  </button>
                  <button onClick={() => setEditing(null)} className="hover:underline">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm">
                    <button
                      onClick={() => {
                        setEditing(c._id);
                        setEditName(c.name);
                      }}
                      className="mr-4 hover:text-accent"
                    >
                      Rename
                    </button>
                    <button onClick={() => remove(c)} className="text-red-800 hover:underline">
                      Delete
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
